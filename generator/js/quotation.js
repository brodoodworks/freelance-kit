/* ==========================================================================
   QUOTATION.JS
   Quotation Generator page: dynamic line items, discount/tax math, a
   realtime A4-style preview, save-to-localStorage, and a print-based
   "Export PDF" (no external library — the browser's native print
   dialog with a print-only stylesheet gives a reliable, dependency
   free A4 PDF from the exact same preview markup).
   ========================================================================== */

const quoPanel = document.querySelector('[data-page-panel="quotation-generator"]');

if (quoPanel) {

  const fields = {};
  quoPanel.querySelectorAll('[data-quo]').forEach((el) => { fields[el.dataset.quo] = el; });

  const itemsContainer = quoPanel.querySelector('[data-quo-items]');
  const previewEl = quoPanel.querySelector('[data-quo-preview]');
  const validationEl = quoPanel.querySelector('[data-quo-validation]');
  const saveFeedbackEl = quoPanel.querySelector('[data-quo-save-feedback]');
  const saveStatusEl = quoPanel.querySelector('[data-quo-save-status]');
  const logoInput = quoPanel.querySelector('[data-quo-logo-input]');
  const logoPreview = quoPanel.querySelector('[data-quo-logo-preview]');
  const logoRemoveBtn = quoPanel.querySelector('[data-quo-logo-remove]');
  const discountValueField = quoPanel.querySelector('[data-quo-discount-value-field]');
  const discountPrefix = quoPanel.querySelector('[data-quo-discount-prefix]');
  const paymentCustomField = quoPanel.querySelector('[data-quo-payment-custom-field]');
  const projectSelect = fields.projectId;
  const noProjectsHint = quoPanel.querySelector('[data-quo-no-projects]');

  let items = [];      // [{ id, description, qty, unitPrice }]
  let logoDataUrl = null;
  let editingQuotationId = null; // set when opening a previously saved quotation
  let currentProjectSnapshot = null; // project name/service, frozen at fill-time
  let quoDirty = false; // tracks real unsaved-changes state for the save-status indicator

  /* ---- Save status indicator — reflects real state only: it starts
     neutral, flips to "Unsaved changes" the moment any field changes,
     and back to "Saved" only after an actual successful save click.
     No autosave is implied or performed. ---- */

  function setQuoDirty(isDirty) {
    quoDirty = isDirty;
    if (!saveStatusEl) return;
    if (isDirty) {
      saveStatusEl.textContent = t("saveStatus.unsaved");
      saveStatusEl.className = "quo-save-status is-dirty";
    } else {
      saveStatusEl.textContent = t("saveStatus.saved");
      saveStatusEl.className = "quo-save-status is-saved";
    }
  }

  /* ---- Currency input (same pattern as calculator.js) ---- */

  function parseDigits(value) {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }
  function formatGrouped(number) {
    return (number || number === 0) ? number.toLocaleString("id-ID") : "";
  }

  quoPanel.querySelectorAll('[data-currency-input], #quo-discount-value').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatGrouped(parseDigits(input.value));
      setQuoDirty(true);
      renderPreview();
    });
  });

  /* ---- Line items ---- */

  function addItem(description, qty, unitPrice) {
    items.push({
      id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      description: description || "",
      qty: qty || 1,
      unitPrice: unitPrice || 0,
    });
    setQuoDirty(true);
    renderItems();
    renderPreview();
  }

  function removeItem(id) {
    items = items.filter((it) => it.id !== id);
    setQuoDirty(true);
    renderItems();
    renderPreview();
  }

  const addItemBtn = quoPanel.querySelector('[data-quo-add-item]');

  function renderItems() {
    if (!items.length) {
      itemsContainer.innerHTML = `
        <div class="quo-items-empty">
          <p class="quo-items-empty-title">Start building your quotation</p>
          <p class="quo-items-empty-text">Add your first service or item to calculate the total.</p>
          <button type="button" class="btn btn-primary" data-quo-add-item-empty>+ Add First Item</button>
        </div>`;
      if (addItemBtn) addItemBtn.hidden = true;
      const emptyCta = itemsContainer.querySelector('[data-quo-add-item-empty]');
      if (emptyCta) emptyCta.addEventListener("click", () => addItem("", 1, 0));
      return;
    }
    if (addItemBtn) addItemBtn.hidden = false;

    itemsContainer.innerHTML = items.map((it) => `
      <div class="quo-item-row" data-item-id="${it.id}">
        <input type="text" class="quo-item-desc" placeholder="Deskripsi layanan" value="${escapeAttr(it.description)}" data-item-field="description">
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
        setQuoDirty(true);
        renderPreview();
      });
      row.querySelector('[data-item-field="qty"]').addEventListener("input", (e) => {
        item.qty = Math.max(1, Number(e.target.value) || 1);
        row.querySelector(".quo-item-total").textContent = formatIDR(item.qty * item.unitPrice);
        setQuoDirty(true);
        renderPreview();
      });
      row.querySelector('[data-item-field="unitPrice"]').addEventListener("input", (e) => {
        item.unitPrice = parseDigits(e.target.value);
        e.target.value = formatGrouped(item.unitPrice);
        row.querySelector(".quo-item-total").textContent = formatIDR(item.qty * item.unitPrice);
        setQuoDirty(true);
        renderPreview();
      });
      row.querySelector('[data-item-remove]').addEventListener("click", () => removeItem(id));
    });
  }

  quoPanel.querySelector('[data-quo-add-item]').addEventListener("click", () => addItem("", 1, 0));

  // Appends a template's items to whatever's already on the form —
  // shared by the in-page "Load from Template" dropdown below and by
  // the Templates page's "Use in Quotation" row action, so both take
  // the exact same code path.
  function addTemplateItems(template) {
    if (!template) return;
    (template.items || []).forEach((it) => addItem(it.description, it.qty, it.unitPrice));
  }

  const loadTemplateSelect = quoPanel.querySelector('[data-quo-load-template]');
  if (loadTemplateSelect) {
    loadTemplateSelect.addEventListener("change", () => {
      addTemplateItems(getTemplateById(loadTemplateSelect.value));
      loadTemplateSelect.value = "";
    });
  }

  /* ---- Logo upload ---- */

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert(t("validation.logoTooLarge"));
      logoInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      logoDataUrl = reader.result;
      renderLogoPreview();
      setQuoDirty(true);
      renderPreview();
    };
    reader.readAsDataURL(file);
  });

  logoRemoveBtn.addEventListener("click", () => {
    logoDataUrl = null;
    logoInput.value = "";
    renderLogoPreview();
    setQuoDirty(true);
    renderPreview();
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

  /* ---- Discount / payment terms conditional fields ---- */

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

  /* ---- Project select: populate + auto-fill on choice ---- */

  function populateProjectSelect(selectedId) {
    const saved = getSavedProjects();
    noProjectsHint.hidden = saved.length > 0;

    const options = ['<option value="">Manual (no project)</option>']
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
      workingHours: project.workingHours,
    };

    if (fields.clientName && !fields.clientName.value) fields.clientName.value = project.client || "";

    // Default the line items from the project if the form is still
    // empty, without overwriting anything the user already typed.
    if (!items.length) {
      addItem(project.serviceType || project.name, 1, project.price || 0);
    }
  }

  /* ---- Business profile: prefill + persist for next time ---- */

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

  const useLatestProfileBtn = quoPanel.querySelector('[data-quo-use-latest-profile]');
  if (useLatestProfileBtn) {
    useLatestProfileBtn.addEventListener("click", () => {
      loadBusinessProfile();
      setQuoDirty(true);
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

  /* ---- Totals ---- */

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

  /* ---- Helpers ---- */

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function formatDateID(dateStr) {
    if (!dateStr) return "\u2014";
    try {
      const locale = getDocLanguage() === "en" ? "en-US" : "id-ID";
      return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    } catch (err) { return dateStr; }
  }

  function paymentTermsText() {
    const type = fields.paymentTermsType.value;
    if (type === "50-50") return td("proposal.paymentTerms.5050");
    if (type === "100-upfront") return td("proposal.paymentTerms.100upfront");
    if (type === "30-70") return td("proposal.paymentTerms.3070");
    return fields.paymentTermsCustom.value || "";
  }

  /* ---- Preview render ---- */

  const summarySubtotalEl = quoPanel.querySelector('[data-quo-summary-subtotal]');
  const summaryDiscountRowEl = quoPanel.querySelector('[data-quo-summary-discount-row]');
  const summaryDiscountEl = quoPanel.querySelector('[data-quo-summary-discount]');
  const summaryTaxRowEl = quoPanel.querySelector('[data-quo-summary-tax-row]');
  const summaryTaxEl = quoPanel.querySelector('[data-quo-summary-tax]');
  const summaryTotalEl = quoPanel.querySelector('[data-quo-summary-total]');

  function updateSummaryCard(totals) {
    if (summarySubtotalEl) summarySubtotalEl.textContent = formatIDR(totals.subtotal);
    if (summaryDiscountRowEl) summaryDiscountRowEl.hidden = totals.discountAmount <= 0;
    if (summaryDiscountEl) summaryDiscountEl.textContent = "-" + formatIDR(totals.discountAmount);
    if (summaryTaxRowEl) summaryTaxRowEl.hidden = totals.taxAmount <= 0;
    if (summaryTaxEl) summaryTaxEl.textContent = formatIDR(totals.taxAmount);
    if (summaryTotalEl) summaryTotalEl.textContent = formatIDR(totals.grandTotal);
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
      <div class="quo-total-row"><span>${td("doc.discount")}</span><span>-${formatIDR(totals.discountAmount)}</span></div>
    ` : "";

    const businessLines = [];
    if (fields.businessAddress.value.trim()) {
      fields.businessAddress.value.trim().split("\n").forEach((line) => {
        if (line.trim()) businessLines.push(line.trim());
      });
    }
    if (fields.businessEmail.value.trim()) businessLines.push(fields.businessEmail.value.trim());
    if (fields.businessPhone.value.trim()) businessLines.push(fields.businessPhone.value.trim());
    if (fields.businessWebsite.value.trim()) businessLines.push(fields.businessWebsite.value.trim());

    previewEl.innerHTML = `
      <div class="quo-doc-head">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="quo-doc-logo" alt="Logo">` : ""}
        <p class="quo-doc-business-name">${escapeHtml(fields.businessName.value) || td("doc.yourBusinessName")}</p>
        ${businessLines.map((line) => `<p class="quo-doc-business-line">${escapeHtml(line)}</p>`).join("")}
      </div>

      <div class="quo-doc-title-row">
        <div>
          <p class="quo-doc-title">${td("doc.quotationTitle")}</p>
          <p class="quo-doc-number">${escapeHtml(fields.quotationNumber.value)}</p>
        </div>
        <div class="quo-doc-dates">
          <p><span>${td("doc.date")}</span>${formatDateID(fields.date.value)}</p>
          <p><span>${td("doc.validUntil")}</span>${formatDateID(fields.validUntil.value)}</p>
        </div>
      </div>

      <div class="quo-doc-divider"></div>

      <p class="quo-doc-section-label">${td("doc.billTo")}</p>
      <p class="quo-doc-bill-name">${escapeHtml(fields.clientCompany.value) || escapeHtml(fields.clientName.value) || td("doc.clientNamePlaceholder")}</p>
      ${fields.clientCompany.value && fields.clientName.value ? `<p>${escapeHtml(fields.clientName.value)}</p>` : ""}
      <p>${[fields.clientEmail.value, fields.clientPhone.value].filter(Boolean).map(escapeHtml).join(" \u00b7 ")}</p>
      ${fields.clientAddress.value ? `<p>${escapeHtml(fields.clientAddress.value)}</p>` : ""}

      ${currentProjectSnapshot ? `
        <div class="quo-doc-divider"></div>
        <p class="quo-doc-section-label">${td("doc.project")}</p>
        <p class="quo-doc-bill-name">${escapeHtml(currentProjectSnapshot.projectName)}</p>
      ` : ""}

      <div class="quo-doc-divider"></div>

      <table class="quo-doc-table">
        <thead>
          <tr><th>${td("doc.description")}</th><th class="num">${td("doc.qty")}</th><th class="num">${td("doc.price")}</th><th class="num">${td("doc.total")}</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4" class="quo-doc-empty">${td("doc.noItemsYet")}</td></tr>`}</tbody>
      </table>

      <div class="quo-doc-totals">
        <div class="quo-total-row"><span>${td("doc.subtotal")}</span><span>${formatIDR(totals.subtotal)}</span></div>
        ${discountRow}
        <div class="quo-total-row"><span>${td("doc.tax")} (${totals.taxPercent}%)</span><span>${formatIDR(totals.taxAmount)}</span></div>
        <div class="quo-total-row quo-total-grand"><span>${td("doc.grandTotal")}</span><span>${formatIDR(totals.grandTotal)}</span></div>
      </div>

      <div class="quo-doc-divider"></div>

      <p class="quo-doc-section-label">${td("doc.paymentTerms")}</p>
      <p class="quo-doc-pre">${escapeHtml(paymentTermsText())}</p>

      <p class="quo-doc-section-label">${td("doc.notes")}</p>
      <p class="quo-doc-pre">${escapeHtml(fields.notes.value)}</p>

      <p class="quo-doc-section-label">${td("doc.termsConditions")}</p>
      <p class="quo-doc-pre">${escapeHtml(fields.terms.value)}</p>

      <div class="quo-doc-divider"></div>
      <p class="quo-doc-footer">${escapeHtml(fields.businessName.value) || td("doc.yourBusinessName")}</p>
    `;

    return totals;
  }

  // Wire every plain field to live-update the preview.
  Object.values(fields).forEach((el) => {
    if (!el || el.dataset.currencyInput !== undefined) return;
    el.addEventListener("input", () => { setQuoDirty(true); renderPreview(); });
    el.addEventListener("change", () => { setQuoDirty(true); renderPreview(); });
  });

  /* ---- Validation ---- */

  function validate() {
    const problems = [];
    if (!fields.businessName.value.trim()) problems.push("Business Name wajib diisi.");
    if (!fields.clientName.value.trim()) problems.push("Client Name wajib diisi.");
    if (!items.length) problems.push("Minimal 1 item pekerjaan.");
    return problems;
  }

  function showValidation(problems) {
    if (!problems.length) { validationEl.hidden = true; return false; }
    validationEl.hidden = false;
    validationEl.textContent = problems.join(" ");
    return true;
  }

  /* ---- Save ---- */

  quoPanel.querySelector('[data-quo-save]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) { saveFeedbackEl.hidden = true; return; }

    const totals = computeTotals();
    persistBusinessProfile();

    const payload = {
      quotationNumber: fields.quotationNumber.value,
      projectId: projectSelect.value || null,
      projectSnapshot: currentProjectSnapshot,
      date: fields.date.value,
      validUntil: fields.validUntil.value,
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
      paymentTerms: { type: fields.paymentTermsType.value, text: paymentTermsText() },
      notes: fields.notes.value,
      terms: fields.terms.value,
    };

    saveFeedbackEl.classList.remove("save-feedback-error");

    if (editingQuotationId) {
      const result = updateQuotationWithStatus(editingQuotationId, payload);
      if (result.ok) {
        saveFeedbackEl.textContent = t("quotation.updated", { number: payload.quotationNumber });
        setQuoDirty(false);
      } else if (result.reason === "not_found") {
        // The quotation we thought we were editing is genuinely gone
        // (deleted elsewhere) — save as a new quotation instead of
        // silently losing the person's current input. Check the
        // fallback create's own success before claiming saved.
        const created = saveQuotationWithStatus(payload);
        if (created.ok) {
          editingQuotationId = created.record.id;
          saveFeedbackEl.textContent = t("quotation.savedAsNew", { number: payload.quotationNumber });
          setQuoDirty(false);
        } else {
          saveFeedbackEl.classList.add("save-feedback-error");
          saveFeedbackEl.textContent = t("quotation.saveError.notFound");
        }
      } else {
        // Storage rejected the update itself — never claim success or
        // silently create a duplicate.
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("quotation.saveError.generic");
      }
    } else {
      const created = saveQuotationWithStatus(payload);
      if (created.ok) {
        editingQuotationId = created.record.id;
        saveFeedbackEl.textContent = t("quotation.saved", { number: payload.quotationNumber });
        setQuoDirty(false);
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("quotation.saveError.create");
      }
    }
    saveFeedbackEl.hidden = false;
  });

  /* ---- PDF (native print, A4). We copy the live preview's rendered
     markup into #quo-print-sheet — a plain block sitting directly under
     <body>, with no sidebar/grid ancestor — so "width: 100%" at print
     time resolves to the true A4 printable width instead of the narrow
     on-screen preview column. ---- */

  const printSheet = document.getElementById("quo-print-sheet");

  quoPanel.querySelector('[data-quo-pdf]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) return;
    renderPreview();
    printSheet.innerHTML = previewEl.innerHTML;
    window.print();
  });

  /* ---- Load an existing quotation (from Project Detail "Open") ---- */

  function loadQuotation(quotation) {
    editingQuotationId = quotation.id;
    fields.quotationNumber.value = quotation.quotationNumber;
    fields.date.value = quotation.date;
    fields.validUntil.value = quotation.validUntil;

    populateProjectSelect(quotation.projectId);
    currentProjectSnapshot = quotation.projectSnapshot || null;

    // Defensive fallbacks: a quotation restored from an older/partial
    // backup could be missing nested objects entirely — fall back to
    // {} so opening it shows blank fields instead of crashing the page.
    const business = quotation.business || {};
    const client = quotation.client || {};
    const discount = quotation.discount || {};
    const paymentTerms = quotation.paymentTerms || {};

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

    items = (quotation.items || []).map((it, i) => ({ id: "item_" + i + "_" + Date.now(), ...it }));
    renderItems();

    fields.discountType.value = discount.type || "none";
    fields.discountValue.value = formatGrouped(discount.value);
    discountValueField.hidden = (discount.type || "none") === "none";
    discountPrefix.textContent = discount.type === "percentage" ? "%" : "Rp";

    fields.tax.value = quotation.tax;

    fields.paymentTermsType.value = paymentTerms.type || "50-50";
    fields.paymentTermsCustom.value = paymentTerms.type === "custom" ? paymentTerms.text : "";
    paymentCustomField.hidden = paymentTerms.type !== "custom";

    fields.notes.value = quotation.notes || "";
    fields.terms.value = quotation.terms || "";

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setQuoDirty(false);
    renderPreview();
  }

  /* ---- Fresh start: new quotation, optionally pre-filled from a project ---- */

  function startNew(projectId) {
    editingQuotationId = null;
    items = [];
    logoDataUrl = null;
    currentProjectSnapshot = null;

    const profileDefaults = getBusinessProfile() || {};
    const validDays = Number(profileDefaults.defaultValidUntil) || 14;

    fields.quotationNumber.value = generateQuotationNumber();
    const today = new Date();
    const validDate = new Date(today.getTime() + validDays * 24 * 60 * 60 * 1000);
    fields.date.value = today.toISOString().slice(0, 10);
    fields.validUntil.value = validDate.toISOString().slice(0, 10);

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

    fields.paymentTermsType.value = profileDefaults.defaultPaymentTerms || "50-50";
    fields.paymentTermsCustom.value = "";
    paymentCustomField.hidden = true;

    fields.notes.value = t("quotation.defaultNotes");
    fields.terms.value = "Project scope and pricing are based on the agreed requirements.";

    loadBusinessProfile();
    populateProjectSelect(projectId);
    if (projectId) applyProjectData(projectId);

    renderItems();
    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setQuoDirty(true);
    renderPreview();
  }

  /* ---- MY QUOTATIONS PAGE ---- */

  let myqSearchTerm = "";
  let myqStatusFilter = "all";
  let myqSortOrder = "updated-desc";

  const myqPanel = document.querySelector('[data-myq-panel]');
  const myqSearchInput = document.querySelector('[data-myq-search]');
  const myqFilterSelect = document.querySelector('[data-myq-filter]');
  const myqSortSelect = document.querySelector('[data-myq-sort]');

  function getFilteredQuotations() {
    const term = myqSearchTerm.trim().toLowerCase();
    const list = getSavedQuotations().filter((q) => {
      const matchesStatus = myqStatusFilter === "all" || q.status === myqStatusFilter;
      const clientName = (q.client && q.client.name) || "";
      const clientCompany = (q.client && q.client.company) || "";
      const matchesSearch = !term ||
        (q.quotationNumber || "").toLowerCase().includes(term) ||
        clientName.toLowerCase().includes(term) ||
        clientCompany.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });

    return list.slice().sort((a, b) => {
      switch (myqSortOrder) {
        case "updated-asc": return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "total-desc": return (Number(b.total) || 0) - (Number(a.total) || 0);
        case "total-asc": return (Number(a.total) || 0) - (Number(b.total) || 0);
        case "updated-desc":
        default: return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }

  function renderMyQuotationsSummary() {
    const el = document.querySelector('[data-myq-summary]');
    if (!el) return;
    const all = getSavedQuotations();
    if (!all.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;

    const totalValue = all.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const accepted = all.filter((q) => q.status === "accepted").length;
    const drafts = all.filter((q) => q.status === "draft").length;

    el.innerHTML = `
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Quotations</span>
        <span class="myp-summary-value">${all.length}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Value</span>
        <span class="myp-summary-value">${formatIDR(totalValue)}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Accepted</span>
        <span class="myp-summary-value">${accepted}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Draft</span>
        <span class="myp-summary-value">${drafts}</span>
      </div>
    `;
  }

  function quotationProjectName(q) {
    if (q.projectId) {
      const project = getProjectById(q.projectId);
      if (project) return project.name;
    }
    return (q.projectSnapshot && q.projectSnapshot.projectName) || "";
  }

  function myqRowMenuHTML(id) {
    return `
      <div class="row-menu" data-row-menu>
        <button type="button" class="icon-btn row-menu-trigger" data-row-menu-trigger aria-label="Actions" aria-haspopup="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="12.8" r="1.15" fill="currentColor"/></svg>
        </button>
        <div class="row-menu-dropdown" data-row-menu-dropdown hidden>
          <button type="button" class="row-menu-item" data-myq-open="${id}">${t("action.open")}</button>
          <button type="button" class="row-menu-item" data-myq-download="${id}">${t("action.exportPdf")}</button>
          <button type="button" class="row-menu-item row-menu-item-danger" data-myq-delete="${id}">${t("action.delete")}</button>
        </div>
      </div>`;
  }

  function wireMyqRowMenus(panel) {
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

    panel.querySelectorAll('[data-myq-open]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = getQuotationById(btn.dataset.myqOpen);
        if (!q) return;
        loadQuotation(q);
        navigateTo("quotation-generator");
        history.replaceState(null, "", "#quotation-generator");
      });
    });

    panel.querySelectorAll('[data-myq-download]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = getQuotationById(btn.dataset.myqDownload);
        if (!q) return;
        loadQuotation(q);
        navigateTo("quotation-generator");
        history.replaceState(null, "", "#quotation-generator");
        setTimeout(() => document.querySelector('[data-quo-pdf]').click(), 150);
      });
    });

    panel.querySelectorAll('[data-myq-delete]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteConfirm(btn.dataset.myqDelete, { type: "quotation" });
      });
    });
  }

  function buildQuotationStatusSelect(q) {
    const options = QUOTATION_STATUS_ORDER.map((key) => {
      const meta = getQuotationStatusMeta(key);
      return `<option value="${key}"${q.status === key ? " selected" : ""}>${meta.label}</option>`;
    }).join("");
    return `<select class="status-select myq-status-select" data-myq-status="${q.id}">${options}</select>`;
  }

  function renderMyQuotationsPage() {
    if (!myqPanel) return;
    renderMyQuotationsSummary();
    const all = getSavedQuotations();
    const filtered = getFilteredQuotations();

    if (!all.length) {
      myqPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5h16M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5M4 8.5l2-4h12l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <h3 class="empty-title">${t("emptyState.quotations.title")}</h3>
          <p class="empty-text">${t("emptyState.quotations.text")}</p>
          <button class="btn btn-primary" data-myq-empty-cta>${t("emptyState.quotations.cta")}</button>
        </div>`;
      myqPanel.querySelector('[data-myq-empty-cta]').addEventListener("click", () => {
        startNew(null);
        navigateTo("quotation-generator");
        history.replaceState(null, "", "#quotation-generator");
      });
      return;
    }

    if (!filtered.length) {
      myqPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <h3 class="empty-title">No matching quotations</h3>
          <p class="empty-text">Coba ubah kata kunci pencarian atau filter status.</p>
        </div>`;
      return;
    }

    const rows = filtered.map((q) => {
      const projectName = quotationProjectName(q);
      return `
      <tr data-myq-row="${q.id}">
        <td class="cell-project">
          <p class="cell-project-name">${escapeHtml(q.quotationNumber || "\u2014")}</p>
          ${projectName ? `<p class="cell-project-sub">${escapeHtml(projectName)}</p>` : ""}
        </td>
        <td class="cell-client">${escapeHtml((q.client && (q.client.company || q.client.name)) || "\u2014")}</td>
        <td class="cell-price num">${formatIDR(q.total)}</td>
        <td>${buildQuotationStatusSelect(q)}</td>
        <td class="cell-updated">${formatRelativeDate(q.updatedAt)}</td>
        <td class="myp-row-actions">${myqRowMenuHTML(q.id)}</td>
      </tr>`;
    }).join("");

    const cards = filtered.map((q) => {
      const status = getQuotationStatusMeta(q.status);
      const projectName = quotationProjectName(q);
      return `
      <div class="project-card-item" data-myq-row="${q.id}">
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(q.quotationNumber || "\u2014")}</p>
            <p class="project-card-client">${escapeHtml((q.client && (q.client.company || q.client.name)) || "\u2014")}${projectName ? " \u00b7 " + escapeHtml(projectName) : ""}</p>
          </div>
          <span class="badge ${status.badgeClass}">${status.label}</span>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-price">${formatIDR(q.total)}</span>
          <span class="project-card-updated">${formatRelativeDate(q.updatedAt)}</span>
        </div>
        <div class="myp-card-actions">${myqRowMenuHTML(q.id)}</div>
      </div>`;
    }).join("");

    myqPanel.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>${t("table.quotation")}</th>
            <th>${t("table.client")}</th>
            <th class="num">${t("table.total")}</th>
            <th>${t("table.status")}</th>
            <th>${t("table.updated")}</th>
            <th>${t("table.actions")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="project-cards">${cards}</div>
    `;

    wireMyqRowMenus(myqPanel);

    myqPanel.querySelectorAll('[data-myq-status]').forEach((sel) => {
      sel.addEventListener("change", (e) => {
        updateQuotationStatus(sel.dataset.myqStatus, e.target.value);
        renderMyQuotationsPage();
      });
    });
  }

  if (myqSearchInput) {
    myqSearchInput.addEventListener("input", () => {
      myqSearchTerm = myqSearchInput.value;
      renderMyQuotationsPage();
    });
  }
  if (myqFilterSelect) {
    myqFilterSelect.addEventListener("change", () => {
      myqStatusFilter = myqFilterSelect.value;
      renderMyQuotationsPage();
    });
  }
  if (myqSortSelect) {
    myqSortSelect.addEventListener("change", () => {
      myqSortOrder = myqSortSelect.value;
      renderMyQuotationsPage();
    });
  }

  window.FreelanceQuotation = { startNew, loadQuotation, renderMyQuotationsPage, addTemplateItems };

  // Document Language (Settings) can change independently of the UI
  // language - redraw this quotation's live preview immediately, no reload.
  window.addEventListener("freelance-doc-language-changed", () => { if (typeof renderPreview === "function") renderPreview(); });

  /* ---- Init ---- */

  startNew(null);
}
