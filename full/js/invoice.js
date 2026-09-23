/* ==========================================================================
   INVOICE.JS
   Invoice Generator page: mirrors quotation.js's architecture closely
   (currency inputs, dynamic line items, discount/tax math, A4 live
   preview, print-based PDF, save/load, My Invoices list) plus the
   invoice-specific bits: status field on the form itself, and optional
   Payment Information (bank/account/instructions).
   ========================================================================== */

const invPanel = document.querySelector('[data-page-panel="invoice-generator"]');

if (invPanel) {

  const fields = {};
  invPanel.querySelectorAll('[data-inv]').forEach((el) => { fields[el.dataset.inv] = el; });

  const itemsContainer = invPanel.querySelector('[data-inv-items]');
  const previewEl = invPanel.querySelector('[data-inv-preview]');
  const validationEl = invPanel.querySelector('[data-inv-validation]');
  const saveFeedbackEl = invPanel.querySelector('[data-inv-save-feedback]');
  const saveStatusEl = invPanel.querySelector('[data-inv-save-status]');
  const logoInput = invPanel.querySelector('[data-inv-logo-input]');
  const logoPreview = invPanel.querySelector('[data-inv-logo-preview]');
  const logoRemoveBtn = invPanel.querySelector('[data-inv-logo-remove]');
  const discountValueField = invPanel.querySelector('[data-inv-discount-value-field]');
  const discountPrefix = invPanel.querySelector('[data-inv-discount-prefix]');
  const paymentCustomField = invPanel.querySelector('[data-inv-payment-custom-field]');
  const projectSelect = fields.projectId;
  const noProjectsHint = invPanel.querySelector('[data-inv-no-projects]');

  const summarySubtotalEl = invPanel.querySelector('[data-inv-summary-subtotal]');
  const summaryDiscountRowEl = invPanel.querySelector('[data-inv-summary-discount-row]');
  const summaryDiscountEl = invPanel.querySelector('[data-inv-summary-discount]');
  const summaryTaxRowEl = invPanel.querySelector('[data-inv-summary-tax-row]');
  const summaryTaxEl = invPanel.querySelector('[data-inv-summary-tax]');
  const summaryTotalEl = invPanel.querySelector('[data-inv-summary-total]');

  let items = [];
  let logoDataUrl = null;
  let editingInvoiceId = null;
  let currentProjectSnapshot = null;
  let invDirty = false;

  /* ---- Save status indicator — real state only, same pattern used by
     the Quotation and Proposal Generators. No autosave is implied. ---- */

  function setInvDirty(isDirty) {
    invDirty = isDirty;
    if (!saveStatusEl) return;
    if (isDirty) {
      saveStatusEl.textContent = t("saveStatus.unsaved");
      saveStatusEl.className = "quo-save-status is-dirty";
    } else {
      saveStatusEl.textContent = t("saveStatus.saved");
      saveStatusEl.className = "quo-save-status is-saved";
    }
  }

  function updateSummaryCard(totals) {
    if (summarySubtotalEl) summarySubtotalEl.textContent = formatIDR(totals.subtotal);
    if (summaryDiscountRowEl) summaryDiscountRowEl.hidden = totals.discountAmount <= 0;
    if (summaryDiscountEl) summaryDiscountEl.textContent = "-" + formatIDR(totals.discountAmount);
    if (summaryTaxRowEl) summaryTaxRowEl.hidden = totals.taxAmount <= 0;
    if (summaryTaxEl) summaryTaxEl.textContent = formatIDR(totals.taxAmount);
    if (summaryTotalEl) summaryTotalEl.textContent = formatIDR(totals.grandTotal);
  }

  fields.status.innerHTML = INVOICE_STATUS_ORDER.map((key) => {
    const meta = getInvoiceStatusMeta(key);
    return `<option value="${key}">${meta.label}</option>`;
  }).join("");

  function parseDigits(value) {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }
  function formatGrouped(number) {
    return (number || number === 0) ? number.toLocaleString("id-ID") : "";
  }
  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function formatDateID(dateStr) {
    if (!dateStr) return "\u2014";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch (err) { return dateStr; }
  }

  invPanel.querySelectorAll('[data-currency-input], #inv-discount-value').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatGrouped(parseDigits(input.value));
      setInvDirty(true);
      renderPreview();
    });
  });

  function addItem(description, qty, unitPrice) {
    items.push({
      id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      description: description || "",
      qty: qty || 1,
      unitPrice: unitPrice || 0,
    });
    setInvDirty(true);
    renderItems();
    renderPreview();
  }

  function removeItem(id) {
    items = items.filter((it) => it.id !== id);
    setInvDirty(true);
    renderItems();
    renderPreview();
  }

  const invAddItemBtn = invPanel.querySelector('[data-inv-add-item]');

  function renderItems() {
    if (!items.length) {
      itemsContainer.innerHTML = `
        <div class="quo-items-empty">
          <p class="quo-items-empty-title">Start building this invoice</p>
          <p class="quo-items-empty-text">Add your first line item to calculate the total.</p>
          <button type="button" class="btn btn-primary" data-inv-add-item-empty>+ Add First Item</button>
        </div>`;
      if (invAddItemBtn) invAddItemBtn.hidden = true;
      const emptyCta = itemsContainer.querySelector('[data-inv-add-item-empty]');
      if (emptyCta) emptyCta.addEventListener("click", () => addItem("", 1, 0));
      return;
    }
    if (invAddItemBtn) invAddItemBtn.hidden = false;

    itemsContainer.innerHTML = items.map((it) => `
      <div class="quo-item-row" data-item-id="${it.id}">
        <input type="text" class="quo-item-desc" placeholder="Website Design" value="${escapeHtml(it.description)}" data-item-field="description">
        <input type="number" class="quo-item-qty" min="1" step="1" value="${it.qty}" data-item-field="qty">
        <div class="input-wrap quo-item-price">
          <span class="input-prefix">Rp</span>
          <input type="text" inputmode="numeric" value="${formatGrouped(it.unitPrice)}" data-item-field="unitPrice">
        </div>
        <span class="quo-item-total">${formatIDR(it.qty * it.unitPrice)}</span>
        <button type="button" class="quo-item-remove" data-item-remove aria-label="Hapus item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
    `).join("");

    itemsContainer.querySelectorAll('[data-item-id]').forEach((row) => {
      const id = row.dataset.itemId;
      const item = items.find((it) => it.id === id);

      row.querySelector('[data-item-field="description"]').addEventListener("input", (e) => {
        item.description = e.target.value;
        setInvDirty(true);
        renderPreview();
      });
      row.querySelector('[data-item-field="qty"]').addEventListener("input", (e) => {
        item.qty = Math.max(1, Number(e.target.value) || 1);
        row.querySelector(".quo-item-total").textContent = formatIDR(item.qty * item.unitPrice);
        setInvDirty(true);
        renderPreview();
      });
      row.querySelector('[data-item-field="unitPrice"]').addEventListener("input", (e) => {
        item.unitPrice = parseDigits(e.target.value);
        e.target.value = formatGrouped(item.unitPrice);
        row.querySelector(".quo-item-total").textContent = formatIDR(item.qty * item.unitPrice);
        setInvDirty(true);
        renderPreview();
      });
      row.querySelector('[data-item-remove]').addEventListener("click", () => removeItem(id));
    });
  }

  invPanel.querySelector('[data-inv-add-item]').addEventListener("click", () => addItem("", 1, 0));

  // Appends a template's items to whatever's already on the form —
  // shared by the in-page "Load from Template" dropdown below and by
  // the Templates page's "Use in Invoice" row action, so both take
  // the exact same code path.
  function addTemplateItems(template) {
    if (!template) return;
    (template.items || []).forEach((it) => addItem(it.description, it.qty, it.unitPrice));
  }

  const loadTemplateSelect = invPanel.querySelector('[data-inv-load-template]');
  if (loadTemplateSelect) {
    loadTemplateSelect.addEventListener("change", () => {
      addTemplateItems(getTemplateById(loadTemplateSelect.value));
      loadTemplateSelect.value = "";
    });
  }

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert(t("validation.logoTooLarge"));
      logoInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result; renderLogoPreview(); setInvDirty(true); renderPreview(); };
    reader.readAsDataURL(file);
  });
  logoRemoveBtn.addEventListener("click", () => {
    logoDataUrl = null; logoInput.value = "";
    renderLogoPreview(); setInvDirty(true); renderPreview();
  });
  function renderLogoPreview() {
    if (logoDataUrl) {
      logoPreview.innerHTML = `<img src="${logoDataUrl}" alt="Logo preview">`;
      logoRemoveBtn.hidden = false;
    } else {
      logoPreview.textContent = t("logo.noLogo");
      logoRemoveBtn.hidden = true;
    }
  }

  fields.discountType.addEventListener("change", () => {
    const type = fields.discountType.value;
    discountValueField.hidden = type === "none";
    discountPrefix.textContent = type === "percentage" ? "%" : "Rp";
    renderPreview();
  });

  fields.paymentTermsType.addEventListener("change", () => {
    paymentCustomField.hidden = fields.paymentTermsType.value !== "custom";
    renderPreview();
  });

  function populateProjectSelect(selectedId) {
    const saved = getSavedProjects();
    noProjectsHint.hidden = saved.length > 0;
    const options = ['<option value="">Select Project (manual entry)</option>']
      .concat(saved.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} \u2014 ${formatIDR(p.price)}</option>`));
    projectSelect.innerHTML = options.join("");
    projectSelect.value = selectedId && saved.some((p) => p.id === selectedId) ? selectedId : "";
  }

  projectSelect.addEventListener("change", () => {
    applyProjectData(projectSelect.value);
    renderPreview();
  });

  function applyProjectData(projectId) {
    if (!projectId) { currentProjectSnapshot = null; return; }
    const project = getProjectById(projectId);
    if (!project) { currentProjectSnapshot = null; return; }

    currentProjectSnapshot = {
      projectId: project.id,
      projectName: project.name,
      serviceType: project.serviceType,
    };

    if (fields.clientName && !fields.clientName.value) fields.clientName.value = project.client || "";

    if (!items.length) {
      addItem(project.serviceType || project.name, 1, project.price || 0);
    }
  }

  function loadBusinessProfile() {
    const profile = getBusinessProfile();
    if (!profile) return;
    if (fields.businessName) fields.businessName.value = profile.businessName || "";
    if (fields.businessEmail) fields.businessEmail.value = profile.businessEmail || "";
    if (fields.businessPhone) fields.businessPhone.value = profile.businessPhone || "";
    if (fields.businessWebsite) fields.businessWebsite.value = profile.businessWebsite || "";
    if (fields.businessAddress) fields.businessAddress.value = profile.businessAddress || "";
    logoDataUrl = profile.logo || null;
    renderLogoPreview();
  }

  const useLatestProfileBtn = invPanel.querySelector('[data-inv-use-latest-profile]');
  if (useLatestProfileBtn) {
    useLatestProfileBtn.addEventListener("click", () => {
      loadBusinessProfile();
      setInvDirty(true);
      renderPreview();
    });
  }

  function persistBusinessProfile() {
    mergeBusinessProfile({
      businessName: fields.businessName.value,
      businessEmail: fields.businessEmail.value,
      businessPhone: fields.businessPhone.value,
      businessWebsite: fields.businessWebsite.value,
      businessAddress: fields.businessAddress.value,
      logo: logoDataUrl,
    });
  }

  function computeTotals() {
    const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

    let discountAmount = 0;
    const discountType = fields.discountType.value;
    const discountValue = parseDigits(fields.discountValue.value);
    if (discountType === "percentage") discountAmount = subtotal * (Math.min(discountValue, 100) / 100);
    else if (discountType === "fixed") discountAmount = Math.min(discountValue, subtotal);

    const taxable = subtotal - discountAmount;
    const taxPercent = Math.min(100, Math.max(0, Number(fields.tax.value) || 0));
    const taxAmount = taxable * (taxPercent / 100);

    const grandTotal = taxable + taxAmount;

    return { subtotal, discountAmount, taxAmount, taxPercent, grandTotal };
  }

  function paymentTermsLabel() {
    const type = fields.paymentTermsType.value;
    if (type === "due-on-receipt") return t("terms.netDueOnReceipt");
    if (type === "7-days") return t("terms.net7days");
    if (type === "14-days") return t("terms.net14days");
    if (type === "30-days") return t("terms.net30days");
    return fields.paymentTermsCustom.value || "";
  }

  function renderPreview() {
    const totals = computeTotals();
    updateSummaryCard(totals);
    const rows = items.map((it) => `
      <tr>
        <td>${escapeHtml(it.description) || "\u2014"}</td>
        <td class="num">${it.qty}</td>
        <td class="num">${formatIDR(it.unitPrice)}</td>
        <td class="num">${formatIDR(it.qty * it.unitPrice)}</td>
      </tr>
    `).join("");

    const discountRow = totals.discountAmount > 0 ? `
      <div class="quo-total-row"><span>Discount</span><span>-${formatIDR(totals.discountAmount)}</span></div>
    ` : "";

    const businessLines = [];
    if (fields.businessAddress.value.trim()) {
      fields.businessAddress.value.trim().split("\n").forEach((line) => { if (line.trim()) businessLines.push(line.trim()); });
    }
    if (fields.businessEmail.value.trim()) businessLines.push(fields.businessEmail.value.trim());
    if (fields.businessPhone.value.trim()) businessLines.push(fields.businessPhone.value.trim());
    if (fields.businessWebsite.value.trim()) businessLines.push(fields.businessWebsite.value.trim());

    const clientAddressLines = fields.clientAddress.value.trim()
      ? fields.clientAddress.value.trim().split("\n").filter((l) => l.trim()).map((l) => `<p>${escapeHtml(l.trim())}</p>`).join("")
      : "";

    const paymentInfoRows = [];
    if (fields.bankName.value.trim()) paymentInfoRows.push(["Bank", fields.bankName.value.trim()]);
    if (fields.accountName.value.trim()) paymentInfoRows.push(["Account Name", fields.accountName.value.trim()]);
    if (fields.accountNumber.value.trim()) paymentInfoRows.push(["Account Number", fields.accountNumber.value.trim()]);

    previewEl.innerHTML = `
      <div class="quo-doc-head">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="quo-doc-logo" alt="Logo">` : ""}
        <p class="quo-doc-business-name">${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
        ${businessLines.map((line) => `<p class="quo-doc-business-line">${escapeHtml(line)}</p>`).join("")}
      </div>

      <div class="quo-doc-title-row">
        <div>
          <p class="quo-doc-title">${t("doc.invoiceTitle")}</p>
          <p class="quo-doc-number">${escapeHtml(fields.invoiceNumber.value)}</p>
        </div>
        <div class="quo-doc-dates">
          <p><span>${t("doc.date")}</span>${formatDateID(fields.date.value)}</p>
          <p><span>${t("doc.due")}</span>${formatDateID(fields.dueDate.value)}</p>
        </div>
      </div>

      <div class="quo-doc-divider"></div>

      <p class="quo-doc-section-label">${t("doc.billTo")}</p>
      <p class="quo-doc-bill-name">${escapeHtml(fields.clientCompany.value) || escapeHtml(fields.clientName.value) || t("doc.clientNamePlaceholder")}</p>
      ${fields.clientCompany.value && fields.clientName.value ? `<p>${escapeHtml(fields.clientName.value)}</p>` : ""}
      ${clientAddressLines}
      ${[fields.clientEmail.value, fields.clientPhone.value].filter(Boolean).length
        ? `<p>${[fields.clientEmail.value, fields.clientPhone.value].filter(Boolean).map(escapeHtml).join(" \u00b7 ")}</p>` : ""}

      ${currentProjectSnapshot ? `
        <div class="quo-doc-divider"></div>
        <p class="quo-doc-section-label">${t("doc.project")}</p>
        <p class="quo-doc-bill-name">${escapeHtml(currentProjectSnapshot.projectName)}</p>
      ` : ""}

      <div class="quo-doc-divider"></div>

      <table class="quo-doc-table">
        <thead>
          <tr><th>${t("doc.description")}</th><th class="num">${t("doc.qty")}</th><th class="num">${t("doc.price")}</th><th class="num">${t("doc.total")}</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4" class="quo-doc-empty">${t("doc.noItemsYet")}</td></tr>`}</tbody>
      </table>

      <div class="quo-doc-totals">
        <div class="quo-total-row"><span>${t("doc.subtotal")}</span><span>${formatIDR(totals.subtotal)}</span></div>
        ${discountRow}
        <div class="quo-total-row"><span>${t("doc.tax")} (${totals.taxPercent}%)</span><span>${formatIDR(totals.taxAmount)}</span></div>
        <div class="quo-total-row quo-total-grand"><span>${t("doc.grandTotal")}</span><span>${formatIDR(totals.grandTotal)}</span></div>
      </div>

      ${paymentInfoRows.length || fields.paymentMethod.value ? `
        <div class="quo-doc-divider"></div>
        <p class="quo-doc-section-label">${t("doc.paymentInformation")}</p>
        ${fields.paymentMethod.value ? `<p class="quo-doc-pre">${escapeHtml(fields.paymentMethod.value)}</p>` : ""}
        ${paymentInfoRows.map(([label, value]) => `<div class="quo-total-row"><span>${label}</span><span>${escapeHtml(value)}</span></div>`).join("")}
        ${fields.paymentInstructions.value.trim() ? `<p class="quo-doc-pre">${escapeHtml(fields.paymentInstructions.value)}</p>` : ""}
      ` : ""}

      <p class="quo-doc-section-label">${t("doc.paymentTerms")}</p>
      <p class="quo-doc-pre">${escapeHtml(paymentTermsLabel())}</p>

      ${fields.notes.value.trim() ? `
        <p class="quo-doc-section-label">${t("doc.notes")}</p>
        <p class="quo-doc-pre">${escapeHtml(fields.notes.value)}</p>
      ` : ""}

      <div class="quo-doc-divider"></div>
      <p class="quo-doc-footer">${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
    `;

    return totals;
  }

  Object.values(fields).forEach((el) => {
    if (!el || el.dataset.currencyInput !== undefined) return;
    el.addEventListener("input", () => { setInvDirty(true); renderPreview(); });
    el.addEventListener("change", () => { setInvDirty(true); renderPreview(); });
  });

  function validate() {
    const problems = [];
    if (!fields.businessName.value.trim()) problems.push("Business Name wajib diisi.");
    if (!fields.clientName.value.trim()) problems.push("Client Name wajib diisi.");
    if (!items.length) problems.push("Minimal 1 item invoice.");
    return problems;
  }
  function showValidation(problems) {
    if (!problems.length) { validationEl.hidden = true; return false; }
    validationEl.hidden = false;
    validationEl.textContent = problems.join(" ");
    return true;
  }

  invPanel.querySelector('[data-inv-save]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) { saveFeedbackEl.hidden = true; return; }

    const totals = computeTotals();
    persistBusinessProfile();

    const payload = {
      invoiceNumber: fields.invoiceNumber.value,
      projectId: projectSelect.value || null,
      projectSnapshot: currentProjectSnapshot,
      date: fields.date.value,
      dueDate: fields.dueDate.value,
      status: fields.status.value,
      business: {
        name: fields.businessName.value,
        email: fields.businessEmail.value,
        phone: fields.businessPhone.value,
        website: fields.businessWebsite.value,
        address: fields.businessAddress.value,
        logo: logoDataUrl,
      },
      client: {
        name: fields.clientName.value,
        company: fields.clientCompany.value,
        email: fields.clientEmail.value,
        phone: fields.clientPhone.value,
        address: fields.clientAddress.value,
      },
      items: items.map((it) => ({ description: it.description, qty: it.qty, unitPrice: it.unitPrice })),
      discount: { type: fields.discountType.value, value: parseDigits(fields.discountValue.value) },
      tax: totals.taxPercent,
      subtotal: totals.subtotal,
      total: totals.grandTotal,
      paymentMethod: fields.paymentMethod.value,
      bankName: fields.bankName.value,
      accountName: fields.accountName.value,
      accountNumber: fields.accountNumber.value,
      paymentInstructions: fields.paymentInstructions.value,
      paymentTerms: { type: fields.paymentTermsType.value, text: paymentTermsLabel() },
      notes: fields.notes.value,
    };

    saveFeedbackEl.classList.remove("save-feedback-error");

    if (editingInvoiceId) {
      const result = updateInvoiceWithStatus(editingInvoiceId, payload);
      if (result.ok) {
        saveFeedbackEl.textContent = t("invoice.updated", { number: payload.invoiceNumber });
        setInvDirty(false);
      } else if (result.reason === "not_found") {
        const created = saveInvoiceWithStatus(payload);
        if (created.ok) {
          editingInvoiceId = created.record.id;
          saveFeedbackEl.textContent = t("invoice.savedAsNew", { number: payload.invoiceNumber });
          setInvDirty(false);
        } else {
          saveFeedbackEl.classList.add("save-feedback-error");
          saveFeedbackEl.textContent = t("invoice.saveError.notFound");
        }
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("invoice.saveError.generic");
      }
    } else {
      const created = saveInvoiceWithStatus(payload);
      if (created.ok) {
        editingInvoiceId = created.record.id;
        saveFeedbackEl.textContent = t("invoice.saved", { number: payload.invoiceNumber });
        setInvDirty(false);
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("invoice.saveError.create");
      }
    }
    saveFeedbackEl.hidden = false;
  });

  const printSheet = document.getElementById("quo-print-sheet");

  invPanel.querySelector('[data-inv-pdf]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) return;
    renderPreview();
    printSheet.innerHTML = previewEl.innerHTML;
    window.print();
  });

  function loadInvoice(invoice) {
    editingInvoiceId = invoice.id;
    fields.invoiceNumber.value = invoice.invoiceNumber;
    fields.date.value = invoice.date;
    fields.dueDate.value = invoice.dueDate;
    fields.status.value = invoice.status || "draft";

    populateProjectSelect(invoice.projectId);
    currentProjectSnapshot = invoice.projectSnapshot || null;

    // Defensive fallbacks: an invoice restored from an older/partial
    // backup could be missing nested objects entirely — fall back to
    // {} so opening it shows blank fields instead of crashing the page.
    const business = invoice.business || {};
    const client = invoice.client || {};
    const discount = invoice.discount || {};
    const paymentTerms = invoice.paymentTerms || {};

    fields.businessName.value = business.name || "";
    fields.businessEmail.value = business.email || "";
    fields.businessPhone.value = business.phone || "";
    fields.businessWebsite.value = business.website || "";
    fields.businessAddress.value = business.address || "";
    logoDataUrl = business.logo || null;
    renderLogoPreview();

    fields.clientName.value = client.name || "";
    fields.clientCompany.value = client.company || "";
    fields.clientEmail.value = client.email || "";
    fields.clientPhone.value = client.phone || "";
    fields.clientAddress.value = client.address || "";

    items = (invoice.items || []).map((it, i) => ({ id: "item_" + i + "_" + Date.now(), ...it }));
    renderItems();

    fields.discountType.value = discount.type || "none";
    fields.discountValue.value = formatGrouped(discount.value);
    discountValueField.hidden = (discount.type || "none") === "none";
    discountPrefix.textContent = discount.type === "percentage" ? "%" : "Rp";

    fields.tax.value = invoice.tax;

    fields.paymentMethod.value = invoice.paymentMethod || "";
    fields.bankName.value = invoice.bankName || "";
    fields.accountName.value = invoice.accountName || "";
    fields.accountNumber.value = invoice.accountNumber || "";
    fields.paymentInstructions.value = invoice.paymentInstructions || "";

    fields.paymentTermsType.value = paymentTerms.type || "due-on-receipt";
    fields.paymentTermsCustom.value = paymentTerms.type === "custom" ? paymentTerms.text : "";
    paymentCustomField.hidden = paymentTerms.type !== "custom";

    fields.notes.value = invoice.notes || "";

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setInvDirty(false);
    renderPreview();
  }

  function startNew(projectId) {
    editingInvoiceId = null;
    items = [];
    logoDataUrl = null;
    currentProjectSnapshot = null;

    const profileDefaults = getBusinessProfile() || {};
    const validDays = Number(profileDefaults.defaultValidUntil) || 14;

    fields.invoiceNumber.value = generateInvoiceNumber();
    const today = new Date();
    const due = new Date(today.getTime() + validDays * 24 * 60 * 60 * 1000);
    fields.date.value = today.toISOString().slice(0, 10);
    fields.dueDate.value = due.toISOString().slice(0, 10);
    fields.status.value = "draft";

    fields.clientName.value = "";
    fields.clientCompany.value = "";
    fields.clientEmail.value = "";
    fields.clientPhone.value = "";
    fields.clientAddress.value = "";

    fields.discountType.value = "none";
    fields.discountValue.value = "";
    discountValueField.hidden = true;
    discountPrefix.textContent = "Rp";

    fields.tax.value = Number(profileDefaults.defaultTax) || 0;

    fields.paymentMethod.value = "";
    fields.bankName.value = "";
    fields.accountName.value = "";
    fields.accountNumber.value = "";
    fields.paymentInstructions.value = "";

    fields.paymentTermsType.value = "due-on-receipt";
    fields.paymentTermsCustom.value = "";
    paymentCustomField.hidden = true;

    fields.notes.value = t("invoice.defaultNotes");

    loadBusinessProfile();
    populateProjectSelect(projectId);
    if (projectId) applyProjectData(projectId);

    renderItems();
    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setInvDirty(true);
    renderPreview();
  }

  let myiSearchTerm = "";
  let myiStatusFilter = "all";
  let myiSortOrder = "updated-desc";
  const myiPanel = document.querySelector('[data-myi-panel]');
  const myiSearchInput = document.querySelector('[data-myi-search]');
  const myiFilterSelect = document.querySelector('[data-myi-filter]');
  const myiSortSelect = document.querySelector('[data-myi-sort]');

  function getFilteredInvoices() {
    const term = myiSearchTerm.trim().toLowerCase();
    const list = getSavedInvoices().filter((i) => {
      const matchesStatus = myiStatusFilter === "all" || i.status === myiStatusFilter;
      const clientName = (i.client && i.client.name) || "";
      const clientCompany = (i.client && i.client.company) || "";
      const matchesSearch = !term ||
        (i.invoiceNumber || "").toLowerCase().includes(term) ||
        clientName.toLowerCase().includes(term) ||
        clientCompany.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });

    return list.slice().sort((a, b) => {
      switch (myiSortOrder) {
        case "updated-asc": return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "total-desc": return (Number(b.total) || 0) - (Number(a.total) || 0);
        case "total-asc": return (Number(a.total) || 0) - (Number(b.total) || 0);
        case "updated-desc":
        default: return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }

  function renderMyInvoicesSummary() {
    const el = document.querySelector('[data-myi-summary]');
    if (!el) return;
    const all = getSavedInvoices();
    if (!all.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;

    const totalValue = all.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const paid = all.filter((i) => i.status === "paid").length;
    const unpaid = all.filter((i) => i.status === "draft" || i.status === "sent" || i.status === "overdue").length;

    el.innerHTML = `
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Invoices</span>
        <span class="myp-summary-value">${all.length}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Invoice Value</span>
        <span class="myp-summary-value">${formatIDR(totalValue)}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Paid</span>
        <span class="myp-summary-value">${paid}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Unpaid</span>
        <span class="myp-summary-value">${unpaid}</span>
      </div>
    `;
  }

  function buildInvoiceStatusSelect(inv) {
    const options = INVOICE_STATUS_ORDER.map((key) => {
      const meta = getInvoiceStatusMeta(key);
      return `<option value="${key}"${inv.status === key ? " selected" : ""}>${meta.label}</option>`;
    }).join("");
    return `<select class="status-select" data-myi-status="${inv.id}">${options}</select>`;
  }

  function invoiceProjectName(inv) {
    if (inv.projectId) {
      const project = getProjectById(inv.projectId);
      if (project) return project.name;
    }
    return (inv.projectSnapshot && inv.projectSnapshot.projectName) || "";
  }

  function myiRowMenuHTML(id) {
    return `
      <div class="row-menu" data-row-menu>
        <button type="button" class="icon-btn row-menu-trigger" data-row-menu-trigger aria-label="Actions" aria-haspopup="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="12.8" r="1.15" fill="currentColor"/></svg>
        </button>
        <div class="row-menu-dropdown" data-row-menu-dropdown hidden>
          <button type="button" class="row-menu-item" data-myi-open="${id}">${t("action.open")}</button>
          <button type="button" class="row-menu-item" data-myi-download="${id}">${t("action.exportPdf")}</button>
          <button type="button" class="row-menu-item row-menu-item-danger" data-myi-delete="${id}">${t("action.delete")}</button>
        </div>
      </div>`;
  }

  function wireMyiRowMenus(panel) {
    panel.querySelectorAll('[data-row-menu]').forEach((menu) => {
      const trigger = menu.querySelector('[data-row-menu-trigger]');
      const dropdown = menu.querySelector('[data-row-menu-dropdown]');
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.hidden;
        panel.querySelectorAll('[data-row-menu-dropdown]').forEach((d) => { d.hidden = true; });
        dropdown.hidden = isOpen;
        if (!isOpen) positionRowMenuDropdown(trigger, dropdown);
      });
    });
    document.addEventListener("click", () => {
      panel.querySelectorAll('[data-row-menu-dropdown]').forEach((d) => { d.hidden = true; });
    });

    panel.querySelectorAll('[data-myi-open]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const inv = getInvoiceById(btn.dataset.myiOpen);
        if (!inv) return;
        loadInvoice(inv);
        navigateTo("invoice-generator");
        history.replaceState(null, "", "#invoice-generator");
      });
    });
    panel.querySelectorAll('[data-myi-download]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const inv = getInvoiceById(btn.dataset.myiDownload);
        if (!inv) return;
        loadInvoice(inv);
        navigateTo("invoice-generator");
        history.replaceState(null, "", "#invoice-generator");
        setTimeout(() => document.querySelector('[data-inv-pdf]').click(), 150);
      });
    });
    panel.querySelectorAll('[data-myi-delete]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteConfirm(btn.dataset.myiDelete, { type: "invoice" });
      });
    });
  }

  function renderMyInvoicesPage() {
    if (!myiPanel) return;
    renderMyInvoicesSummary();
    const all = getSavedInvoices();
    const filtered = getFilteredInvoices();

    if (!all.length) {
      myiPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5h16M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5M4 8.5l2-4h12l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <h3 class="empty-title">${t("emptyState.invoices.title")}</h3>
          <p class="empty-text">${t("emptyState.invoices.text")}</p>
          <button class="btn btn-primary" data-myi-empty-cta>${t("emptyState.invoices.cta")}</button>
        </div>`;
      myiPanel.querySelector('[data-myi-empty-cta]').addEventListener("click", () => {
        startNew(null);
        navigateTo("invoice-generator");
        history.replaceState(null, "", "#invoice-generator");
      });
      return;
    }

    if (!filtered.length) {
      myiPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <h3 class="empty-title">No matching invoices</h3>
          <p class="empty-text">Coba ubah kata kunci pencarian atau filter status.</p>
        </div>`;
      return;
    }

    const rows = filtered.map((inv) => {
      const projectName = invoiceProjectName(inv);
      return `
      <tr data-myi-row="${inv.id}">
        <td class="cell-project">
          <p class="cell-project-name">${escapeHtml(inv.invoiceNumber || "\u2014")}</p>
          ${projectName ? `<p class="cell-project-sub">${escapeHtml(projectName)}</p>` : ""}
        </td>
        <td class="cell-client">${escapeHtml((inv.client && (inv.client.company || inv.client.name)) || "\u2014")}</td>
        <td class="cell-price num">${formatIDR(inv.total)}</td>
        <td>${buildInvoiceStatusSelect(inv)}</td>
        <td class="cell-updated">${formatRelativeDate(inv.updatedAt)}</td>
        <td class="myp-row-actions">${myiRowMenuHTML(inv.id)}</td>
      </tr>`;
    }).join("");

    const cards = filtered.map((inv) => {
      const status = getInvoiceStatusMeta(inv.status);
      const projectName = invoiceProjectName(inv);
      return `
      <div class="project-card-item" data-myi-row="${inv.id}">
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(inv.invoiceNumber || "\u2014")}</p>
            <p class="project-card-client">${escapeHtml((inv.client && (inv.client.company || inv.client.name)) || "\u2014")}${projectName ? " \u00b7 " + escapeHtml(projectName) : ""}</p>
          </div>
          <span class="badge ${status.badgeClass}">${status.label}</span>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-price">${formatIDR(inv.total)}</span>
          <span class="project-card-updated">${formatRelativeDate(inv.updatedAt)}</span>
        </div>
        <div class="myp-card-actions">${myiRowMenuHTML(inv.id)}</div>
      </div>`;
    }).join("");

    myiPanel.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>${t("table.invoice")}</th><th>${t("table.client")}</th><th class="num">${t("table.total")}</th><th>${t("table.status")}</th><th>${t("table.updated")}</th><th>${t("table.actions")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="project-cards">${cards}</div>
    `;

    wireMyiRowMenus(myiPanel);

    myiPanel.querySelectorAll('[data-myi-status]').forEach((sel) => {
      sel.addEventListener("change", (e) => {
        updateInvoiceStatus(sel.dataset.myiStatus, e.target.value);
        renderMyInvoicesPage();
      });
    });
  }

  if (myiSearchInput) {
    myiSearchInput.addEventListener("input", () => { myiSearchTerm = myiSearchInput.value; renderMyInvoicesPage(); });
  }
  if (myiFilterSelect) {
    myiFilterSelect.addEventListener("change", () => { myiStatusFilter = myiFilterSelect.value; renderMyInvoicesPage(); });
  }
  if (myiSortSelect) {
    myiSortSelect.addEventListener("change", () => { myiSortOrder = myiSortSelect.value; renderMyInvoicesPage(); });
  }

  window.FreelanceInvoice = { startNew, loadInvoice, renderMyInvoicesPage, addTemplateItems };

  startNew(null);
}
