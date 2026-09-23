/* ==========================================================================
   RATECARD.JS
   Rate Card Generator: a general service price list, not tied to one
   client or deal. Mirrors quotation.js's architecture (currency
   inputs, A4 live preview, print-based PDF, save/load) but drops
   client info, discount/tax, and totals — a rate card is a menu of
   prices, not a transaction.
   ========================================================================== */

const ratePanel = document.querySelector('[data-page-panel="rate-card-generator"]');

if (ratePanel) {

  const fields = {};
  ratePanel.querySelectorAll('[data-rate]').forEach((el) => { fields[el.dataset.rate] = el; });

  const itemsContainer = ratePanel.querySelector('[data-rate-items]');
  const previewEl = ratePanel.querySelector('[data-rate-preview]');
  const validationEl = ratePanel.querySelector('[data-rate-validation]');
  const saveFeedbackEl = ratePanel.querySelector('[data-rate-save-feedback]');
  const logoInput = ratePanel.querySelector('[data-rate-logo-input]');
  const logoPreview = ratePanel.querySelector('[data-rate-logo-preview]');
  const logoRemoveBtn = ratePanel.querySelector('[data-rate-logo-remove]');

  let items = [];
  let logoDataUrl = null;
  let editingRateCardId = null;

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

  function addItem(description, price, unit) {
    items.push({
      id: "svc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      description: description || "",
      price: price || 0,
      unit: unit || "",
    });
    renderItems();
    renderPreview();
  }

  function removeItem(id) {
    items = items.filter((it) => it.id !== id);
    renderItems();
    renderPreview();
  }

  function renderItems() {
    if (!items.length) {
      itemsContainer.innerHTML = `<p class="field-help">Belum ada layanan. Klik "+ Add Service".</p>`;
      return;
    }

    itemsContainer.innerHTML = items.map((it) => `
      <div class="rate-item-row" data-item-id="${it.id}">
        <input type="text" class="quo-item-desc" placeholder="UI/UX Design" value="${escapeHtml(it.description)}" data-item-field="description">
        <div class="input-wrap rate-item-price">
          <span class="input-prefix">Rp</span>
          <input type="text" inputmode="numeric" value="${formatGrouped(it.price)}" data-item-field="price">
        </div>
        <input type="text" class="rate-item-unit" placeholder="${t("unit.perHour")}" value="${escapeHtml(it.unit)}" data-item-field="unit">
        <button type="button" class="quo-item-remove" data-item-remove aria-label="Hapus layanan">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
    `).join("");

    itemsContainer.querySelectorAll('[data-item-id]').forEach((row) => {
      const id = row.dataset.itemId;
      const item = items.find((it) => it.id === id);

      row.querySelector('[data-item-field="description"]').addEventListener("input", (e) => {
        item.description = e.target.value;
        renderPreview();
      });
      row.querySelector('[data-item-field="price"]').addEventListener("input", (e) => {
        item.price = parseDigits(e.target.value);
        e.target.value = formatGrouped(item.price);
        renderPreview();
      });
      row.querySelector('[data-item-field="unit"]').addEventListener("input", (e) => {
        item.unit = e.target.value;
        renderPreview();
      });
      row.querySelector('[data-item-remove]').addEventListener("click", () => removeItem(id));
    });
  }

  ratePanel.querySelector('[data-rate-add-item]').addEventListener("click", () => addItem("", 0, ""));

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert(t("validation.logoTooLarge"));
      logoInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result; renderLogoPreview(); renderPreview(); };
    reader.readAsDataURL(file);
  });
  logoRemoveBtn.addEventListener("click", () => {
    logoDataUrl = null; logoInput.value = "";
    renderLogoPreview(); renderPreview();
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

  function loadBusinessProfile() {
    const profile = getBusinessProfile();
    if (!profile) return;
    if (fields.businessName) fields.businessName.value = profile.businessName || "";
    if (fields.businessEmail) fields.businessEmail.value = profile.businessEmail || "";
    if (fields.businessPhone) fields.businessPhone.value = profile.businessPhone || "";
    if (fields.businessWebsite) fields.businessWebsite.value = profile.businessWebsite || "";
    logoDataUrl = profile.logo || null;
    renderLogoPreview();
  }
  function persistBusinessProfile() {
    mergeBusinessProfile({
      businessName: fields.businessName.value,
      businessEmail: fields.businessEmail.value,
      businessPhone: fields.businessPhone.value,
      businessWebsite: fields.businessWebsite.value,
      logo: logoDataUrl,
    });
  }

  const useLatestProfileBtn = ratePanel.querySelector('[data-rate-use-latest-profile]');
  if (useLatestProfileBtn) {
    useLatestProfileBtn.addEventListener("click", () => {
      loadBusinessProfile();
      renderPreview();
    });
  }

  function renderPreview() {
    const rows = items.map((it) => `
      <tr>
        <td>${escapeHtml(it.description) || "\u2014"}</td>
        <td class="num">${formatIDR(it.price)}${it.unit ? ` <span class="rate-doc-unit">${escapeHtml(it.unit)}</span>` : ""}</td>
      </tr>
    `).join("");

    const businessLines = [];
    if (fields.businessEmail.value.trim()) businessLines.push(fields.businessEmail.value.trim());
    if (fields.businessPhone.value.trim()) businessLines.push(fields.businessPhone.value.trim());
    if (fields.businessWebsite.value.trim()) businessLines.push(fields.businessWebsite.value.trim());

    const validityLine = fields.validFrom.value
      ? `<p class="quo-doc-pre">${t("doc.validFrom")} ${formatDateID(fields.validFrom.value)}${fields.validUntil.value ? ` ${t("doc.to")} ${formatDateID(fields.validUntil.value)}` : ""}</p>`
      : "";

    previewEl.innerHTML = `
      <div class="quo-doc-head">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="quo-doc-logo" alt="Logo">` : ""}
        <p class="quo-doc-business-name">${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
        ${businessLines.map((line) => `<p class="quo-doc-business-line">${escapeHtml(line)}</p>`).join("")}
      </div>

      <div class="quo-doc-divider"></div>

      <p class="quo-doc-title">${escapeHtml(fields.title.value) || t("doc.serviceRates")}</p>
      ${validityLine}

      <div class="quo-doc-divider"></div>

      <table class="quo-doc-table rate-doc-table">
        <thead>
          <tr><th>${t("doc.service")}</th><th class="num">${t("doc.price")}</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="2" class="quo-doc-empty">${t("doc.noServicesYet")}</td></tr>`}</tbody>
      </table>

      ${fields.notes.value.trim() ? `
        <div class="quo-doc-divider"></div>
        <p class="quo-doc-section-label">${t("doc.notes")}</p>
        <p class="quo-doc-pre">${escapeHtml(fields.notes.value)}</p>
      ` : ""}

      <div class="quo-doc-divider"></div>
      <p class="quo-doc-footer">${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
    `;
  }

  Object.values(fields).forEach((el) => {
    if (!el) return;
    el.addEventListener("input", renderPreview);
    el.addEventListener("change", renderPreview);
  });

  function validate() {
    const problems = [];
    if (!fields.businessName.value.trim()) problems.push("Business Name wajib diisi.");
    if (!items.length) problems.push("Minimal 1 layanan.");
    return problems;
  }
  function showValidation(problems) {
    if (!problems.length) { validationEl.hidden = true; return false; }
    validationEl.hidden = false;
    validationEl.textContent = problems.join(" ");
    return true;
  }

  ratePanel.querySelector('[data-rate-save]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) { saveFeedbackEl.hidden = true; return; }

    persistBusinessProfile();

    const payload = {
      title: fields.title.value || t("doc.serviceRates"),
      validFrom: fields.validFrom.value,
      validUntil: fields.validUntil.value,
      business: {
        name: fields.businessName.value,
        email: fields.businessEmail.value,
        phone: fields.businessPhone.value,
        website: fields.businessWebsite.value,
        logo: logoDataUrl,
      },
      items: items.map((it) => ({ description: it.description, price: it.price, unit: it.unit })),
      notes: fields.notes.value,
    };

    saveFeedbackEl.classList.remove("save-feedback-error");

    if (editingRateCardId) {
      const result = updateRateCardWithStatus(editingRateCardId, payload);
      if (result.ok) {
        saveFeedbackEl.textContent = t("rateCard.updated", { title: payload.title });
      } else if (result.reason === "not_found") {
        const created = saveRateCardWithStatus(payload);
        if (created.ok) {
          editingRateCardId = created.record.id;
          saveFeedbackEl.textContent = t("rateCard.savedAsNew", { title: payload.title });
        } else {
          saveFeedbackEl.classList.add("save-feedback-error");
          saveFeedbackEl.textContent = t("rateCard.saveError.notFound");
        }
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("rateCard.saveError.generic");
      }
    } else {
      const created = saveRateCardWithStatus(payload);
      if (created.ok) {
        editingRateCardId = created.record.id;
        saveFeedbackEl.textContent = t("rateCard.saved", { title: payload.title });
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("rateCard.saveError.create");
      }
    }
    saveFeedbackEl.hidden = false;
  });

  const printSheet = document.getElementById("quo-print-sheet");

  ratePanel.querySelector('[data-rate-pdf]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) return;
    renderPreview();
    printSheet.innerHTML = previewEl.innerHTML;
    window.print();
  });

  function loadRateCard(rateCard) {
    editingRateCardId = rateCard.id;
    fields.title.value = rateCard.title || "";
    fields.validFrom.value = rateCard.validFrom || "";
    fields.validUntil.value = rateCard.validUntil || "";

    // Defensive fallback: a rate card restored from an older/partial
    // backup could be missing the business object entirely.
    const business = rateCard.business || {};
    fields.businessName.value = business.name || "";
    fields.businessEmail.value = business.email || "";
    fields.businessPhone.value = business.phone || "";
    fields.businessWebsite.value = business.website || "";
    logoDataUrl = business.logo || null;
    renderLogoPreview();

    items = (rateCard.items || []).map((it, i) => ({ id: "svc_" + i + "_" + Date.now(), ...it }));
    renderItems();

    fields.notes.value = rateCard.notes || "";

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    renderPreview();
  }

  function startNew() {
    editingRateCardId = null;
    items = [];
    logoDataUrl = null;

    fields.title.value = t("rateCard.defaultTitle", { year: new Date().getFullYear() });
    fields.validFrom.value = new Date().toISOString().slice(0, 10);
    fields.validUntil.value = "";
    fields.notes.value = t("rateCard.defaultNotes");

    loadBusinessProfile();

    items = [
      { id: "svc_default_1", description: "", price: 0, unit: "" },
    ];
    renderItems();

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    renderPreview();
  }

  let myrcSearchTerm = "";
  let myrcSortOrder = "updated-desc";
  const myrcPanel = document.querySelector('[data-myrc-panel]');
  const myrcSearchInput = document.querySelector('[data-myrc-search]');
  const myrcSortSelect = document.querySelector('[data-myrc-sort]');

  function getFilteredRateCards() {
    const term = myrcSearchTerm.trim().toLowerCase();
    const list = getSavedRateCards().filter((r) => {
      if (!term) return true;
      const titleMatch = (r.title || "").toLowerCase().includes(term);
      const serviceMatch = (r.items || []).some((it) => (it.description || "").toLowerCase().includes(term));
      return titleMatch || serviceMatch;
    });

    return list.slice().sort((a, b) => {
      switch (myrcSortOrder) {
        case "updated-asc": return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "name-asc": return (a.title || "").localeCompare(b.title || "");
        case "updated-desc":
        default: return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }

  function renderMyRateCardsSummary() {
    const el = document.querySelector('[data-myrc-summary]');
    if (!el) return;
    const all = getSavedRateCards();
    if (!all.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;

    // Only count services that actually have a name — a rate card can
    // legitimately be saved with a blank starter row still in it, and
    // counting that as a real "service" would make the stat misleading.
    const allServices = all.flatMap((r) => r.items || []).filter((it) => (it.description || "").trim());
    const totalServices = allServices.length;
    const avgRate = totalServices
      ? allServices.reduce((sum, it) => sum + (Number(it.price) || 0), 0) / totalServices
      : 0;

    el.innerHTML = `
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Rate Cards</span>
        <span class="myp-summary-value">${all.length}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Services</span>
        <span class="myp-summary-value">${totalServices}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Average Rate</span>
        <span class="myp-summary-value">${formatIDR(avgRate)}</span>
      </div>
    `;
  }

  function myrcRowMenuHTML(id) {
    return `
      <div class="row-menu" data-row-menu>
        <button type="button" class="icon-btn row-menu-trigger" data-row-menu-trigger aria-label="Actions" aria-haspopup="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="12.8" r="1.15" fill="currentColor"/></svg>
        </button>
        <div class="row-menu-dropdown" data-row-menu-dropdown hidden>
          <button type="button" class="row-menu-item" data-myrc-open="${id}">${t("action.open")}</button>
          <button type="button" class="row-menu-item" data-myrc-download="${id}">${t("action.exportPdf")}</button>
          <button type="button" class="row-menu-item row-menu-item-danger" data-myrc-delete="${id}">${t("action.delete")}</button>
        </div>
      </div>`;
  }

  function wireMyrcRowMenus(panel) {
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

    panel.querySelectorAll('[data-myrc-open]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = getRateCardById(btn.dataset.myrcOpen);
        if (!r) return;
        loadRateCard(r);
        navigateTo("rate-card-generator");
        history.replaceState(null, "", "#rate-card-generator");
      });
    });
    panel.querySelectorAll('[data-myrc-download]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = getRateCardById(btn.dataset.myrcDownload);
        if (!r) return;
        loadRateCard(r);
        navigateTo("rate-card-generator");
        history.replaceState(null, "", "#rate-card-generator");
        setTimeout(() => document.querySelector('[data-rate-pdf]').click(), 150);
      });
    });
    panel.querySelectorAll('[data-myrc-delete]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteConfirm(btn.dataset.myrcDelete, { type: "rate-card" });
      });
    });
  }

  function renderMyRateCardsPage() {
    if (!myrcPanel) return;
    renderMyRateCardsSummary();
    const all = getSavedRateCards();
    const filtered = getFilteredRateCards();

    if (!all.length) {
      myrcPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5h16M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5M4 8.5l2-4h12l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <h3 class="empty-title">${t("emptyState.rateCards.title")}</h3>
          <p class="empty-text">${t("emptyState.rateCards.text")}</p>
          <button class="btn btn-primary" data-myrc-empty-cta>${t("emptyState.rateCards.cta")}</button>
        </div>`;
      myrcPanel.querySelector('[data-myrc-empty-cta]').addEventListener("click", () => {
        startNew();
        navigateTo("rate-card-generator");
        history.replaceState(null, "", "#rate-card-generator");
      });
      return;
    }

    if (!filtered.length) {
      myrcPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <h3 class="empty-title">No matching rate cards</h3>
          <p class="empty-text">Coba ubah kata kunci pencarian.</p>
        </div>`;
      return;
    }

    const rows = filtered.map((r) => {
      const count = (r.items || []).filter((it) => (it.description || "").trim()).length;
      return `
      <tr data-myrc-row="${r.id}">
        <td class="cell-project">
          <p class="cell-project-name">${escapeHtml(r.title || "\u2014")}</p>
          <p class="cell-project-sub">${count} service${count === 1 ? "" : "s"}</p>
        </td>
        <td class="cell-client">${r.validFrom ? formatDateID(r.validFrom) : "\u2014"}</td>
        <td class="cell-updated">${formatRelativeDate(r.updatedAt)}</td>
        <td class="myp-row-actions">${myrcRowMenuHTML(r.id)}</td>
      </tr>`;
    }).join("");

    const cards = filtered.map((r) => {
      const count = (r.items || []).filter((it) => (it.description || "").trim()).length;
      return `
      <div class="project-card-item" data-myrc-row="${r.id}">
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(r.title || "\u2014")}</p>
            <p class="project-card-client">${count} service${count === 1 ? "" : "s"}${r.validFrom ? " \u00b7 Valid from " + formatDateID(r.validFrom) : ""}</p>
          </div>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-updated">${formatRelativeDate(r.updatedAt)}</span>
        </div>
        <div class="myp-card-actions">${myrcRowMenuHTML(r.id)}</div>
      </div>`;
    }).join("");

    myrcPanel.innerHTML = `
      <table class="table">
        <thead><tr><th>${t("table.rateCard")}</th><th>${t("table.validFrom")}</th><th>${t("table.updated")}</th><th>${t("table.actions")}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="project-cards">${cards}</div>
    `;

    wireMyrcRowMenus(myrcPanel);
  }

  if (myrcSearchInput) {
    myrcSearchInput.addEventListener("input", () => { myrcSearchTerm = myrcSearchInput.value; renderMyRateCardsPage(); });
  }
  if (myrcSortSelect) {
    myrcSortSelect.addEventListener("change", () => { myrcSortOrder = myrcSortSelect.value; renderMyRateCardsPage(); });
  }

  window.FreelanceRateCard = { startNew, loadRateCard, renderMyRateCardsPage };

  startNew();
}
