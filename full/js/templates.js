/* ==========================================================================
   TEMPLATES.JS
   Manages reusable line-item bundles (name + [{description, qty,
   unitPrice}]).

   Two things live on this page:
   1. A compact, searchable/sortable list of saved templates (the
      default view).
   2. A create/edit form that stays hidden until the user actively
      starts a new template (topbar "+ New Template") or edits an
      existing one — it is NOT a second generator, just the existing
      form shown on demand.

   Templates are also consumed elsewhere: the "Load from Template"
   dropdown in Quotation Generator and Invoice Generator's items
   section appends a template's items to whatever's already on the
   form. This file exposes that same append logic so the row actions
   here ("Use in Quotation" / "Use in Invoice") can drive it too,
   instead of duplicating the logic.
   ========================================================================== */

const tplPanel = document.querySelector('[data-page-panel="templates"]');

if (tplPanel) {

  const nameInput = tplPanel.querySelector('[data-tpl="name"]');
  const itemsContainer = tplPanel.querySelector('[data-tpl-items]');
  const validationEl = tplPanel.querySelector('[data-tpl-validation]');
  const saveFeedbackEl = tplPanel.querySelector('[data-tpl-save-feedback]');
  const formTitleEl = tplPanel.querySelector('[data-tpl-form-title]');
  const cancelBtn = tplPanel.querySelector('[data-tpl-cancel]');
  const formPanel = tplPanel.querySelector('[data-tpl-form-panel]');

  const summaryEl = tplPanel.querySelector('[data-tpl-summary]');
  const listPanel = tplPanel.querySelector('[data-tpl-panel]');
  const searchInput = tplPanel.querySelector('[data-tpl-search]');
  const sortSelect = tplPanel.querySelector('[data-tpl-sort]');

  let items = [];
  let editingTemplateId = null;
  let tplSearchTerm = "";
  let tplSortOrder = "updated-desc";

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

  /* ---------------------------------------------------------------------
     CREATE / EDIT FORM
     Hidden by default — this is the same form/logic that has always
     driven template creation, just shown on demand instead of
     permanently occupying the top of the page.
     --------------------------------------------------------------------- */

  function addItem(description, qty, unitPrice) {
    items.push({
      id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      description: description || "",
      qty: qty || 1,
      unitPrice: unitPrice || 0,
    });
    renderItems();
  }

  function removeItem(id) {
    items = items.filter((it) => it.id !== id);
    renderItems();
  }

  function renderItems() {
    if (!items.length) {
      itemsContainer.innerHTML = `<p class="field-help">Belum ada item. Klik "+ Add Item".</p>`;
      return;
    }

    itemsContainer.innerHTML = items.map((it) => `
      <div class="quo-item-row" data-item-id="${it.id}">
        <input type="text" class="quo-item-desc" placeholder="UI/UX Design" value="${escapeHtml(it.description)}" data-item-field="description">
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

      row.querySelector('[data-item-field="description"]').addEventListener("input", (e) => { item.description = e.target.value; });
      row.querySelector('[data-item-field="qty"]').addEventListener("input", (e) => {
        item.qty = Math.max(1, Number(e.target.value) || 1);
        row.querySelector(".quo-item-total").textContent = formatIDR(item.qty * item.unitPrice);
      });
      row.querySelector('[data-item-field="unitPrice"]').addEventListener("input", (e) => {
        item.unitPrice = parseDigits(e.target.value);
        e.target.value = formatGrouped(item.unitPrice);
        row.querySelector(".quo-item-total").textContent = formatIDR(item.qty * item.unitPrice);
      });
      row.querySelector('[data-item-remove]').addEventListener("click", () => removeItem(id));
    });
  }

  tplPanel.querySelector('[data-tpl-add-item]').addEventListener("click", () => addItem("", 1, 0));

  function validate() {
    const problems = [];
    if (!nameInput.value.trim()) problems.push("Template Name wajib diisi.");
    if (!items.length) problems.push("Minimal 1 item.");
    return problems;
  }
  function showValidation(problems) {
    if (!problems.length) { validationEl.hidden = true; return false; }
    validationEl.hidden = false;
    validationEl.textContent = problems.join(" ");
    return true;
  }

  function showForm() {
    formPanel.hidden = false;
    if (typeof formPanel.scrollIntoView === "function") {
      formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function hideForm() {
    formPanel.hidden = true;
  }

  // Full reset — clears the form back to a blank "new template" state
  // AND closes the panel, so this doubles as the "return to list" action
  // (used on cancel, after a successful save, and whenever the page is
  // (re)entered without the person having asked to create/edit anything).
  function resetForm() {
    editingTemplateId = null;
    nameInput.value = "";
    items = [{ id: "item_default_1", description: "", qty: 1, unitPrice: 0 }];
    renderItems();
    formTitleEl.textContent = t("template.createTitle");
    validationEl.hidden = true;
    saveFeedbackEl.hidden = true;
    hideForm();
  }

  // Opens the form for a brand-new template — this is what the topbar
  // "+ New Template" button and the empty-state CTA both trigger.
  function openNewTemplateForm() {
    resetForm();
    showForm();
    if (typeof nameInput.focus === "function") nameInput.focus();
  }

  function loadTemplateIntoForm(template) {
    editingTemplateId = template.id;
    nameInput.value = template.name || "";
    items = (template.items || []).map((it, i) => ({ id: "item_" + i + "_" + Date.now(), ...it }));
    renderItems();
    formTitleEl.textContent = t("template.editingTitle", { name: template.name });
    validationEl.hidden = true;
    saveFeedbackEl.hidden = true;
    showForm();
  }

  cancelBtn.addEventListener("click", resetForm);

  tplPanel.querySelector('[data-tpl-save]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) { saveFeedbackEl.hidden = true; return; }

    const payload = {
      name: nameInput.value.trim(),
      items: items.map((it) => ({ description: it.description, qty: it.qty, unitPrice: it.unitPrice })),
    };

    const savedName = payload.name;
    let outcome; // "updated" | "created" | "fallback_created" | "failed"

    if (editingTemplateId) {
      const result = updateTemplateWithStatus(editingTemplateId, payload);
      if (result.ok) {
        outcome = "updated";
      } else if (result.reason === "not_found") {
        // The template we thought we were editing is genuinely gone
        // (deleted elsewhere) — save as a new template instead of
        // silently losing the person's current input. The fallback
        // create can itself fail, so its success is checked too.
        const created = saveTemplateWithStatus(payload);
        outcome = created.ok ? "fallback_created" : "failed";
      } else {
        // Storage rejected the update itself — never silently create
        // a duplicate or claim success.
        outcome = "failed";
      }
    } else {
      const created = saveTemplateWithStatus(payload);
      outcome = created.ok ? "created" : "failed";
    }

    if (outcome === "failed") {
      if (typeof showToast === "function") {
        showToast(t("template.saveError.title"), t("template.saveError.detail"));
      }
      return; // keep the form open with the person's input intact
    }

    resetForm();
    renderTemplatesList();
    refreshTemplateDropdowns();
    if (typeof showToast === "function") {
      showToast(outcome === "fallback_created"
        ? t("template.fallbackCreated")
        : t("template.savedSuccessfully", { name: savedName }));
    }
  });

  /* ---------------------------------------------------------------------
     "USE TEMPLATE" — append a template's items into whichever generator
     the person picks. Reuses the exact same append logic as the
     in-generator "Load from Template" dropdown (via window.FreelanceQuotation
     / window.FreelanceInvoice), so behavior is identical and the original
     template is never mutated.
     --------------------------------------------------------------------- */

  function useTemplateIn(template, docType) {
    if (docType === "quotation") {
      if (window.FreelanceQuotation && typeof window.FreelanceQuotation.addTemplateItems === "function") {
        window.FreelanceQuotation.addTemplateItems(template);
      }
      navigateTo("quotation-generator");
      history.replaceState(null, "", "#quotation-generator");
    } else if (docType === "invoice") {
      if (window.FreelanceInvoice && typeof window.FreelanceInvoice.addTemplateItems === "function") {
        window.FreelanceInvoice.addTemplateItems(template);
      }
      navigateTo("invoice-generator");
      history.replaceState(null, "", "#invoice-generator");
    }
    if (typeof showToast === "function") {
      showToast(t("template.itemsAdded", { name: template.name }));
    }
  }

  /* ---------------------------------------------------------------------
     LIST — search, sort, summary, table (desktop) + cards (mobile),
     row actions menu. Mirrors the My Rate Cards / My Projects pattern
     already used elsewhere in the app.
     --------------------------------------------------------------------- */

  function realItemCount(tpl) {
    return (tpl.items || []).filter((it) => (it.description || "").trim()).length;
  }
  function templateValue(tpl) {
    return (tpl.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  }

  function getFilteredTemplates() {
    const term = tplSearchTerm.trim().toLowerCase();
    const list = getSavedTemplates().filter((tpl) => {
      if (!term) return true;
      const nameMatch = (tpl.name || "").toLowerCase().includes(term);
      const itemMatch = (tpl.items || []).some((it) => (it.description || "").toLowerCase().includes(term));
      return nameMatch || itemMatch;
    });

    return list.slice().sort((a, b) => {
      switch (tplSortOrder) {
        case "updated-asc": return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "name-asc": return (a.name || "").localeCompare(b.name || "");
        case "updated-desc":
        default: return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }

  function renderSummary() {
    const all = getSavedTemplates();
    if (!all.length) {
      summaryEl.hidden = true;
      summaryEl.innerHTML = "";
      return;
    }
    summaryEl.hidden = false;

    const totalItems = all.reduce((sum, tpl) => sum + realItemCount(tpl), 0);

    summaryEl.innerHTML = `
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Templates</span>
        <span class="myp-summary-value">${all.length}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Saved Items</span>
        <span class="myp-summary-value">${totalItems}</span>
      </div>
    `;
  }

  function rowMenuHTML(id) {
    return `
      <div class="row-menu" data-row-menu>
        <button type="button" class="icon-btn row-menu-trigger" data-row-menu-trigger aria-label="Actions" aria-haspopup="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="12.8" r="1.15" fill="currentColor"/></svg>
        </button>
        <div class="row-menu-dropdown" data-row-menu-dropdown hidden>
          <button type="button" class="row-menu-item" data-tpl-use-quo="${id}">${t("action.useInQuotation")}</button>
          <button type="button" class="row-menu-item" data-tpl-use-inv="${id}">${t("action.useInInvoice")}</button>
          <button type="button" class="row-menu-item" data-tpl-edit="${id}">${t("action.edit")}</button>
          <button type="button" class="row-menu-item" data-tpl-duplicate="${id}">${t("action.duplicate")}</button>
          <button type="button" class="row-menu-item row-menu-item-danger" data-tpl-delete="${id}">${t("action.delete")}</button>
        </div>
      </div>`;
  }

  function wireRowMenus(panel) {
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

    panel.querySelectorAll('[data-tpl-use-quo]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = getTemplateById(btn.dataset.tplUseQuo);
        if (tpl) useTemplateIn(tpl, "quotation");
      });
    });
    panel.querySelectorAll('[data-tpl-use-inv]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = getTemplateById(btn.dataset.tplUseInv);
        if (tpl) useTemplateIn(tpl, "invoice");
      });
    });
    panel.querySelectorAll('[data-tpl-edit]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = getTemplateById(btn.dataset.tplEdit);
        if (tpl) loadTemplateIntoForm(tpl);
      });
    });
    panel.querySelectorAll('[data-tpl-duplicate]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = getTemplateById(btn.dataset.tplDuplicate);
        if (!tpl) return;
        const copy = saveTemplateWithStatus({
          name: `${tpl.name} (Copy)`,
          items: (tpl.items || []).map((it) => ({ description: it.description, qty: it.qty, unitPrice: it.unitPrice })),
        });
        if (!copy.ok) {
          if (typeof showToast === "function") {
            showToast(t("template.duplicateError.title"), t("template.duplicateError.detail"));
          }
          return;
        }
        renderTemplatesList();
        refreshTemplateDropdowns();
        if (typeof showToast === "function") showToast(t("template.duplicatedAs", { name: copy.record.name }));
      });
    });
    panel.querySelectorAll('[data-tpl-delete]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteConfirm(btn.dataset.tplDelete, { type: "template" });
      });
    });
  }

  function renderTemplatesList() {
    renderSummary();

    const all = getSavedTemplates();
    const filtered = getFilteredTemplates();

    if (!all.length) {
      listPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 9.5h16" stroke="currentColor" stroke-width="1.5"/></svg>
          </div>
          <h3 class="empty-title">${t("emptyState.templates.title")}</h3>
          <p class="empty-text">${t("emptyState.templates.text")}</p>
          <button class="btn btn-primary" data-tpl-empty-cta>${t("emptyState.templates.cta")}</button>
        </div>`;
      const emptyCta = listPanel.querySelector('[data-tpl-empty-cta]');
      if (emptyCta) emptyCta.addEventListener("click", openNewTemplateForm);
      return;
    }

    if (!filtered.length) {
      listPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <h3 class="empty-title">No matching templates</h3>
          <p class="empty-text">Coba ubah kata kunci pencarian.</p>
        </div>`;
      return;
    }

    const rows = filtered.map((tpl) => {
      const count = realItemCount(tpl);
      return `
      <tr data-tpl-row="${tpl.id}">
        <td class="cell-project">
          <p class="cell-project-name">${escapeHtml(tpl.name)}</p>
          <p class="cell-project-sub">${count} item${count === 1 ? "" : "s"}</p>
        </td>
        <td class="cell-client">${formatIDR(templateValue(tpl))}</td>
        <td class="cell-updated">${formatRelativeDate(tpl.updatedAt)}</td>
        <td class="myp-row-actions">${rowMenuHTML(tpl.id)}</td>
      </tr>`;
    }).join("");

    const cards = filtered.map((tpl) => {
      const count = realItemCount(tpl);
      return `
      <div class="project-card-item" data-tpl-row="${tpl.id}">
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(tpl.name)}</p>
            <p class="project-card-client">${count} item${count === 1 ? "" : "s"} \u00b7 ${formatIDR(templateValue(tpl))}</p>
          </div>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-updated">${formatRelativeDate(tpl.updatedAt)}</span>
        </div>
        <div class="myp-card-actions">${rowMenuHTML(tpl.id)}</div>
      </div>`;
    }).join("");

    listPanel.innerHTML = `
      <table class="table">
        <thead><tr><th>${t("table.template")}</th><th>${t("table.totalValue")}</th><th>${t("table.updated")}</th><th>${t("table.actions")}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="project-cards">${cards}</div>
    `;

    wireRowMenus(listPanel);
  }

  function refreshTemplateDropdowns() {
    const templates = getSavedTemplates();
    const options = ['<option value="">\u2014</option>'].concat(
      templates.map((tpl) => `<option value="${tpl.id}">${escapeHtml(tpl.name)} (${(tpl.items || []).length} item)</option>`)
    ).join("");

    document.querySelectorAll('[data-quo-load-template], [data-inv-load-template]').forEach((sel) => {
      sel.innerHTML = options;
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => { tplSearchTerm = searchInput.value; renderTemplatesList(); });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", () => { tplSortOrder = sortSelect.value; renderTemplatesList(); });
  }

  window.FreelanceTemplates = { renderTemplatesList, refreshTemplateDropdowns, resetForm, openNewTemplateForm };

  resetForm();
  renderTemplatesList();
  refreshTemplateDropdowns();
}
