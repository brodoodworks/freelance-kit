/* ==========================================================================
   PROPOSAL.JS
   Proposal Generator page logic. Mirrors quotation.js's architecture
   (currency inputs, A4 live preview, print-based PDF, save/load,
   My Proposals list) with the extra dynamic sections a proposal needs:
   Objectives, Scope of Work, Deliverables, Timeline.
   ========================================================================== */

const propPanel = document.querySelector('[data-page-panel="proposal-generator"]');

if (propPanel) {

  const fields = {};
  propPanel.querySelectorAll('[data-prop]').forEach((el) => { fields[el.dataset.prop] = el; });

  const previewEl = propPanel.querySelector('[data-prop-preview]');
  const validationEl = propPanel.querySelector('[data-prop-validation]');
  const saveFeedbackEl = propPanel.querySelector('[data-prop-save-feedback]');
  const saveStatusEl = propPanel.querySelector('[data-prop-save-status]');
  const investmentDisplayEl = propPanel.querySelector('[data-prop-investment-display]');
  const logoInput = propPanel.querySelector('[data-prop-logo-input]');
  const logoPreview = propPanel.querySelector('[data-prop-logo-preview]');
  const logoRemoveBtn = propPanel.querySelector('[data-prop-logo-remove]');
  const paymentCustomField = propPanel.querySelector('[data-prop-payment-custom-field]');
  const projectSelect = fields.projectId;
  const noProjectsHint = propPanel.querySelector('[data-prop-no-projects]');

  const objectivesContainer = propPanel.querySelector('[data-prop-objectives]');
  const scopeContainer = propPanel.querySelector('[data-prop-scope]');
  const deliverablesContainer = propPanel.querySelector('[data-prop-deliverables]');
  const timelineContainer = propPanel.querySelector('[data-prop-timeline]');

  let objectives = [];    // [string]
  let scope = [];         // [{ id, title, description }]
  let deliverables = [];  // [string]
  let timeline = [];      // [{ id, phase, description, duration }]
  let logoDataUrl = null;
  let editingProposalId = null;
  let currentProjectSnapshot = null;
  let propDirty = false;

  /* ---- Custom sections ----
     Beyond the fixed Objectives / Scope / Deliverables / Timeline blocks,
     a proposal can have any number of its own sections — same shape as
     Scope of Work (a title you set yourself, plus numbered title+description
     items) — for things like "Scope of Work — Phase 2" or anything else
     the fixed sections don't name. sectionOrder is the actual document
     order of this whole reorderable group (the 4 fixed keys plus each
     custom section's id); moving a section up/down reorders this array,
     and the DOM + preview both follow it. */
  let customSections = []; // [{ id, title, enabled, items: [{ id, title, description }] }]
  let sectionOrder = ["objectives", "scope", "deliverables", "timeline"];

  /* ---- Section include/exclude toggles ----
     Every "Proposal Content" section can be switched off so it stays in
     the form (still editable, content kept) but is left out of the
     exported document — instead of the only way to omit a section being
     to delete everything typed into it. Investment and Payment Terms
     aren't included here: a proposal without a price isn't really a
     proposal, so those two always render. */
  const SECTION_TOGGLE_KEYS = ["objectives", "scope", "deliverables", "timeline", "next-steps", "terms", "footer"];
  let sectionEnabled = Object.fromEntries(SECTION_TOGGLE_KEYS.map((k) => [k, true]));

  function applySectionToggleUI() {
    SECTION_TOGGLE_KEYS.forEach((key) => {
      const item = propPanel.querySelector(`[data-accordion-item="${key}"]`);
      const checkbox = propPanel.querySelector(`[data-section-enable="${key}"]`);
      const enabled = sectionEnabled[key] !== false;
      if (checkbox) checkbox.checked = enabled;
      if (item) item.classList.toggle("is-section-off", !enabled);
    });
  }

  /* ---- Reorder controls (Objectives, Scope, Deliverables, Timeline) ----
     Every repeatable row gets a move-up / move-down button next to its
     remove button, so the order isn't stuck at whatever it was added in —
     no drag-and-drop needed for a handful of rows, and it works the same
     on touch as it does with a mouse. */
  const MOVE_UP_ICON = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6.3 5 3.3 8 6.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MOVE_DOWN_ICON = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.7 5 6.7 8 3.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function moveButtonsHTML(i, length) {
    return `
      <div class="prop-row-updown">
        <button type="button" class="prop-row-move" data-move="up" aria-label="${t("action.moveUp")}" ${i === 0 ? "disabled" : ""}>${MOVE_UP_ICON}</button>
        <button type="button" class="prop-row-move" data-move="down" aria-label="${t("action.moveDown")}" ${i === length - 1 ? "disabled" : ""}>${MOVE_DOWN_ICON}</button>
      </div>
    `;
  }
  function wireMoveButtons(row, i, array, rerender) {
    const upBtn = row.querySelector('[data-move="up"]');
    const downBtn = row.querySelector('[data-move="down"]');
    if (upBtn) upBtn.addEventListener("click", () => {
      if (i === 0) return;
      [array[i - 1], array[i]] = [array[i], array[i - 1]];
      setPropDirty(true);
      rerender();
      renderPreview();
    });
    if (downBtn) downBtn.addEventListener("click", () => {
      if (i === array.length - 1) return;
      [array[i + 1], array[i]] = [array[i], array[i + 1]];
      setPropDirty(true);
      rerender();
      renderPreview();
    });
  }

  /* ---- Section-level reorder (whole blocks: Objectives, Scope,
     Deliverables, Timeline, and any custom section) ----
     Same up/down idea as wireMoveButtons above, but moving an entire
     accordion item — both in sectionOrder (which drives the document)
     and in the actual DOM (so the accordion visually reorders too). */
  function reorderSectionsInDOM() {
    const container = propPanel.querySelector(".prop-accordion");
    const investmentEl = propPanel.querySelector('[data-accordion-item="investment"]');
    if (!container || !investmentEl) return;
    sectionOrder.forEach((key) => {
      const el = propPanel.querySelector(`[data-accordion-item="${key}"]`);
      if (el) container.insertBefore(el, investmentEl);
    });
  }
  function updateSectionMoveButtonsState() {
    sectionOrder.forEach((key, idx) => {
      const el = propPanel.querySelector(`[data-accordion-item="${key}"]`);
      if (!el) return;
      const up = el.querySelector('[data-section-move="up"]');
      const down = el.querySelector('[data-section-move="down"]');
      if (up) up.disabled = idx === 0;
      if (down) down.disabled = idx === sectionOrder.length - 1;
    });
  }
  function moveSection(key, dir) {
    const idx = sectionOrder.indexOf(key);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sectionOrder.length) return;
    [sectionOrder[idx], sectionOrder[newIdx]] = [sectionOrder[newIdx], sectionOrder[idx]];
    setPropDirty(true);
    reorderSectionsInDOM();
    updateSectionMoveButtonsState();
    renderPreview();
  }
  function wireSectionMoveButtons(itemEl, key) {
    const up = itemEl.querySelector('[data-section-move="up"]');
    const down = itemEl.querySelector('[data-section-move="down"]');
    if (up) up.addEventListener("click", (e) => { e.stopPropagation(); moveSection(key, -1); });
    if (down) down.addEventListener("click", (e) => { e.stopPropagation(); moveSection(key, 1); });
  }
  ["objectives", "scope", "deliverables", "timeline"].forEach((key) => {
    const el = propPanel.querySelector(`[data-accordion-item="${key}"]`);
    if (el) wireSectionMoveButtons(el, key);
  });

  /* ---- Custom sections (user-named, same shape as Scope of Work) ---- */

  function customSectionSummaryText(cs) {
    if (cs.enabled === false) return t("proposal.accordion.notIncluded");
    const count = cs.items.filter((it) => it.title.trim()).length;
    return count
      ? t(count === 1 ? "proposal.accordion.scope.count.one" : "proposal.accordion.scope.count.other", { n: count })
      : t("proposal.accordion.scope.empty");
  }
  function updateCustomSectionSummary(cs) {
    const el = propPanel.querySelector(`[data-accordion-summary="${cs.id}"]`);
    if (el) el.textContent = customSectionSummaryText(cs);
  }
  function renderCustomSectionItems(cs) {
    const container = propPanel.querySelector(`[data-custom-section-items="${cs.id}"]`);
    if (!container) return;
    if (!cs.items.length) {
      container.innerHTML = `<p class="field-help">${t("prop.emptyScope")}</p>`;
    } else {
      container.innerHTML = cs.items.map((item, i) => `
        <div class="prop-scope-row" data-id="${item.id}">
          <div class="prop-scope-number">${String(i + 1).padStart(2, "0")}</div>
          <div class="prop-scope-fields">
            <input type="text" class="prop-list-input" value="${escapeHtml(item.title)}" placeholder="${t("prop.customItemTitlePlaceholder")}" data-scope-title>
            <textarea rows="2" class="prop-scope-desc" placeholder="${t("prop.shortDescPlaceholder")}" data-scope-desc>${escapeHtml(item.description)}</textarea>
          </div>
          ${moveButtonsHTML(i, cs.items.length)}
          <button type="button" class="quo-item-remove" data-scope-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      container.querySelectorAll("[data-id]").forEach((row) => {
        const item = cs.items.find((s) => s.id === row.dataset.id);
        const i = cs.items.indexOf(item);
        row.querySelector("[data-scope-title]").addEventListener("input", (e) => { item.title = e.target.value; setPropDirty(true); updateCustomSectionSummary(cs); renderPreview(); });
        row.querySelector("[data-scope-desc]").addEventListener("input", (e) => { item.description = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector("[data-scope-remove]").addEventListener("click", () => {
          cs.items = cs.items.filter((s) => s.id !== item.id);
          setPropDirty(true);
          renderCustomSectionItems(cs);
          updateCustomSectionSummary(cs);
          renderPreview();
        });
        wireMoveButtons(row, i, cs.items, () => renderCustomSectionItems(cs));
      });
    }
  }
  function createCustomSectionElement(cs) {
    const wrapper = document.createElement("div");
    wrapper.className = "prop-accordion-item is-open";
    wrapper.dataset.accordionItem = cs.id;
    wrapper.innerHTML = `
      <div class="prop-accordion-header-row prop-accordion-header-row-custom">
        <input type="text" class="prop-section-title-input" data-custom-title placeholder="${t("prop.customSectionTitlePlaceholder")}" value="${escapeHtml(cs.title)}">
        <div class="prop-row-updown prop-section-move">
          <button type="button" class="prop-row-move" data-section-move="up" aria-label="${t("action.moveUp")}">${MOVE_UP_ICON}</button>
          <button type="button" class="prop-row-move" data-section-move="down" aria-label="${t("action.moveDown")}">${MOVE_DOWN_ICON}</button>
        </div>
        <label class="prop-section-switch">
          <input type="checkbox" ${cs.enabled !== false ? "checked" : ""} data-custom-section-enable aria-label="${t("proposal.accordion.includeToggleLabel")}">
          <span class="prop-section-switch-track"><span class="prop-section-switch-thumb"></span></span>
        </label>
        <button type="button" class="quo-item-remove" data-custom-section-remove aria-label="${t("action.remove")}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <button type="button" class="prop-accordion-header prop-accordion-header-chevron-only" data-accordion-toggle aria-label="${t("action.expandCollapse")}">
          <span class="prop-accordion-summary" data-accordion-summary="${cs.id}"></span>
          <svg class="prop-accordion-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.3 7 8.7l3.5-3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="prop-accordion-body" data-accordion-body>
        <div class="prop-scope-items" data-custom-section-items="${cs.id}"></div>
        <button type="button" class="btn btn-secondary quo-add-item" data-custom-section-add-item>${t("action.addItem")}</button>
      </div>
    `;
    return wrapper;
  }
  function wireCustomSectionElement(el, cs) {
    el.querySelector("[data-custom-title]").addEventListener("input", (e) => {
      cs.title = e.target.value;
      setPropDirty(true);
      renderPreview();
    });
    el.querySelector("[data-custom-section-enable]").addEventListener("change", (e) => {
      cs.enabled = e.target.checked;
      el.classList.toggle("is-section-off", !e.target.checked);
      setPropDirty(true);
      updateCustomSectionSummary(cs);
      renderPreview();
    });
    el.querySelector("[data-custom-section-remove]").addEventListener("click", () => {
      customSections = customSections.filter((s) => s.id !== cs.id);
      sectionOrder = sectionOrder.filter((k) => k !== cs.id);
      el.remove();
      setPropDirty(true);
      updateSectionMoveButtonsState();
      renderPreview();
    });
    el.querySelector("[data-custom-section-add-item]").addEventListener("click", () => {
      cs.items.push({ id: uid("item"), title: "", description: "" });
      setPropDirty(true);
      renderCustomSectionItems(cs);
      updateCustomSectionSummary(cs);
      renderPreview();
    });
    wireSectionMoveButtons(el, cs.id);
    renderCustomSectionItems(cs);
    updateCustomSectionSummary(cs);
  }
  function addCustomSection() {
    const cs = { id: uid("section"), title: "", enabled: true, items: [{ id: uid("item"), title: "", description: "" }] };
    customSections.push(cs);
    sectionOrder.push(cs.id);
    const container = propPanel.querySelector(".prop-accordion");
    const investmentEl = propPanel.querySelector('[data-accordion-item="investment"]');
    const el = createCustomSectionElement(cs);
    container.insertBefore(el, investmentEl);
    wireCustomSectionElement(el, cs);
    updateSectionMoveButtonsState();
    setPropDirty(true);
    renderPreview();
    const titleInput = el.querySelector("[data-custom-title]");
    if (titleInput) titleInput.focus();
  }
  const addSectionBtn = propPanel.querySelector("[data-prop-add-section]");
  if (addSectionBtn) addSectionBtn.addEventListener("click", addCustomSection);

  // Rebuilds every custom-section DOM element from the customSections
  // array (used after loading a saved proposal, and on Start New) —
  // clears whatever was there before rather than trying to diff it.
  function rebuildCustomSectionsDOM() {
    propPanel.querySelectorAll('.prop-accordion-item[data-accordion-item^="section_"]').forEach((el) => el.remove());
    const container = propPanel.querySelector(".prop-accordion");
    const investmentEl = propPanel.querySelector('[data-accordion-item="investment"]');
    if (!container || !investmentEl) return;
    customSections.forEach((cs) => {
      const el = createCustomSectionElement(cs);
      container.insertBefore(el, investmentEl);
      wireCustomSectionElement(el, cs);
    });
    reorderSectionsInDOM();
    updateSectionMoveButtonsState();
  }

  /* ---- Save status indicator — real state only, same pattern as the
     Quotation Generator. No autosave is implied or performed. ---- */

  function setPropDirty(isDirty) {
    propDirty = isDirty;
    if (!saveStatusEl) return;
    if (isDirty) {
      saveStatusEl.textContent = t("saveStatus.unsaved");
      saveStatusEl.className = "quo-save-status is-dirty";
    } else {
      saveStatusEl.textContent = t("saveStatus.saved");
      saveStatusEl.className = "quo-save-status is-saved";
    }
  }

  /* ---- Accordion (Proposal Content sections) ---- */

  propPanel.querySelectorAll('[data-accordion-toggle]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest('[data-accordion-item]');
      const body = item.querySelector('[data-accordion-body]');
      item.classList.toggle("is-open");
      body.hidden = !item.classList.contains("is-open");
    });
  });

  propPanel.querySelectorAll('[data-section-enable]').forEach((checkbox) => {
    // Sits next to the accordion's expand/collapse button, not inside it —
    // no click-propagation guard needed, but stop it anyway in case markup
    // ever nests it back inside the button.
    checkbox.addEventListener("click", (e) => e.stopPropagation());
    checkbox.addEventListener("change", () => {
      const key = checkbox.dataset.sectionEnable;
      sectionEnabled[key] = checkbox.checked;
      const item = checkbox.closest('[data-accordion-item]');
      if (item) item.classList.toggle("is-section-off", !checkbox.checked);
      setPropDirty(true);
      updateAccordionSummaries();
      renderPreview();
    });
  });

  function accordionSummary(key, text) {
    const el = propPanel.querySelector(`[data-accordion-summary="${key}"]`);
    if (!el) return;
    if (SECTION_TOGGLE_KEYS.includes(key) && sectionEnabled[key] === false) {
      el.textContent = t("proposal.accordion.notIncluded");
      return;
    }
    el.textContent = text;
  }

  function updateAccordionSummaries() {
    const objCount = objectives.filter((o) => o.trim()).length;
    accordionSummary("objectives", objCount ? t(objCount === 1 ? "proposal.accordion.objectives.count.one" : "proposal.accordion.objectives.count.other", { n: objCount }) : t("proposal.accordion.objectives.empty"));

    const scopeCount = scope.filter((s) => s.title.trim()).length;
    accordionSummary("scope", scopeCount ? t(scopeCount === 1 ? "proposal.accordion.scope.count.one" : "proposal.accordion.scope.count.other", { n: scopeCount }) : t("proposal.accordion.scope.empty"));

    const delCount = deliverables.filter((d) => d.trim()).length;
    accordionSummary("deliverables", delCount ? t(delCount === 1 ? "proposal.accordion.deliverables.count.one" : "proposal.accordion.deliverables.count.other", { n: delCount }) : t("proposal.accordion.deliverables.empty"));

    const phaseCount = timeline.filter((t) => t.description.trim()).length;
    accordionSummary("timeline", phaseCount ? t(phaseCount === 1 ? "proposal.accordion.timeline.count.one" : "proposal.accordion.timeline.count.other", { n: phaseCount }) : t("proposal.accordion.timeline.empty"));

    accordionSummary("investment", formatIDR(parseDigits(fields.investment.value)));
    accordionSummary("payment-terms", paymentTermsText());
    accordionSummary("next-steps", fields.nextSteps.value.trim() ? t("proposal.accordion.filledIn") : t("proposal.accordion.notFilledIn"));
    accordionSummary("terms", fields.terms.value.trim() ? t("proposal.accordion.filledIn") : t("proposal.accordion.notFilledIn"));
    accordionSummary("footer", fields.footerNote.value.trim() ? t("proposal.accordion.filledIn") : t("proposal.accordion.notFilledIn"));
  }

  /* ---- Helpers (same pattern as quotation.js) ---- */

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
      const locale = getDocLanguage() === "en" ? "en-US" : "id-ID";
      return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    } catch (err) { return dateStr; }
  }
  function uid(prefix) { return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }

  propPanel.querySelectorAll('[data-currency-input]').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatGrouped(parseDigits(input.value));
      setPropDirty(true);
      renderPreview();
    });
  });

  /* ---- Objectives (simple string list) ---- */

  function renderObjectives() {
    if (!objectives.length) {
      objectivesContainer.innerHTML = `<p class="field-help">${t("prop.emptyObjectives")}</p>`;
    } else {
      objectivesContainer.innerHTML = objectives.map((text, i) => `
        <div class="prop-list-row" data-idx="${i}">
          <input type="text" class="prop-list-input" value="${escapeHtml(text)}" placeholder="${t("prop.objectivePlaceholder")}" data-objective-input>
          ${moveButtonsHTML(i, objectives.length)}
          <button type="button" class="quo-item-remove" data-objective-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      objectivesContainer.querySelectorAll('[data-idx]').forEach((row) => {
        const i = Number(row.dataset.idx);
        row.querySelector('[data-objective-input]').addEventListener("input", (e) => { objectives[i] = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-objective-remove]').addEventListener("click", () => { objectives.splice(i, 1); setPropDirty(true); renderObjectives(); renderPreview(); });
        wireMoveButtons(row, i, objectives, renderObjectives);
      });
    }
  }
  propPanel.querySelector('[data-prop-add-objective]').addEventListener("click", () => { objectives.push(""); setPropDirty(true); renderObjectives(); renderPreview(); });

  /* ---- Deliverables (simple string checklist, same pattern) ---- */

  function renderDeliverables() {
    if (!deliverables.length) {
      deliverablesContainer.innerHTML = `<p class="field-help">${t("prop.emptyDeliverables")}</p>`;
    } else {
      deliverablesContainer.innerHTML = deliverables.map((text, i) => `
        <div class="prop-list-row" data-idx="${i}">
          <input type="text" class="prop-list-input" value="${escapeHtml(text)}" placeholder="${t("prop.deliverablePlaceholder")}" data-deliverable-input>
          ${moveButtonsHTML(i, deliverables.length)}
          <button type="button" class="quo-item-remove" data-deliverable-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      deliverablesContainer.querySelectorAll('[data-idx]').forEach((row) => {
        const i = Number(row.dataset.idx);
        row.querySelector('[data-deliverable-input]').addEventListener("input", (e) => { deliverables[i] = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-deliverable-remove]').addEventListener("click", () => { deliverables.splice(i, 1); setPropDirty(true); renderDeliverables(); renderPreview(); });
        wireMoveButtons(row, i, deliverables, renderDeliverables);
      });
    }
  }
  propPanel.querySelector('[data-prop-add-deliverable]').addEventListener("click", () => { deliverables.push(""); setPropDirty(true); renderDeliverables(); renderPreview(); });

  /* ---- Scope of Work (title + description items) ---- */

  function renderScope() {
    if (!scope.length) {
      scopeContainer.innerHTML = `<p class="field-help">${t("prop.emptyScope")}</p>`;
    } else {
      scopeContainer.innerHTML = scope.map((item, i) => `
        <div class="prop-scope-row" data-id="${item.id}">
          <div class="prop-scope-number">${String(i + 1).padStart(2, "0")}</div>
          <div class="prop-scope-fields">
            <input type="text" class="prop-list-input" value="${escapeHtml(item.title)}" placeholder="UI/UX Design" data-scope-title>
            <textarea rows="2" class="prop-scope-desc" placeholder="${t("prop.shortDescPlaceholder")}" data-scope-desc>${escapeHtml(item.description)}</textarea>
          </div>
          ${moveButtonsHTML(i, scope.length)}
          <button type="button" class="quo-item-remove" data-scope-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      scopeContainer.querySelectorAll('[data-id]').forEach((row) => {
        const item = scope.find((s) => s.id === row.dataset.id);
        const i = scope.indexOf(item);
        row.querySelector('[data-scope-title]').addEventListener("input", (e) => { item.title = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-scope-desc]').addEventListener("input", (e) => { item.description = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-scope-remove]').addEventListener("click", () => {
          scope = scope.filter((s) => s.id !== item.id);
          setPropDirty(true);
          renderScope(); renderPreview();
        });
        wireMoveButtons(row, i, scope, renderScope);
      });
    }
  }
  propPanel.querySelector('[data-prop-add-scope]').addEventListener("click", () => {
    scope.push({ id: uid("scope"), title: "", description: "" });
    setPropDirty(true);
    renderScope(); renderPreview();
  });

  /* ---- Timeline (phase + description + duration) ---- */

  function renderTimeline() {
    if (!timeline.length) {
      timelineContainer.innerHTML = `<p class="field-help">${t("prop.emptyTimeline")}</p>`;
    } else {
      timelineContainer.innerHTML = timeline.map((item, i) => `
        <div class="prop-timeline-row" data-id="${item.id}">
          <div class="prop-scope-number">P${i + 1}</div>
          <div class="prop-timeline-fields">
            <input type="text" class="prop-list-input" value="${escapeHtml(item.description)}" placeholder="${t("prop.phaseDescPlaceholder")}" data-timeline-desc>
            <input type="text" class="prop-list-input prop-timeline-duration" value="${escapeHtml(item.duration)}" placeholder="${t("prop.defaultDuration3Days")}" data-timeline-duration>
          </div>
          ${moveButtonsHTML(i, timeline.length)}
          <button type="button" class="quo-item-remove" data-timeline-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      timelineContainer.querySelectorAll('[data-id]').forEach((row) => {
        const item = timeline.find((t) => t.id === row.dataset.id);
        const i = timeline.indexOf(item);
        row.querySelector('[data-timeline-desc]').addEventListener("input", (e) => { item.description = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-timeline-duration]').addEventListener("input", (e) => { item.duration = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-timeline-remove]').addEventListener("click", () => {
          timeline = timeline.filter((t) => t.id !== item.id);
          setPropDirty(true);
          renderTimeline(); renderPreview();
        });
        wireMoveButtons(row, i, timeline, renderTimeline);
      });
    }
  }
  propPanel.querySelector('[data-prop-add-phase]').addEventListener("click", () => {
    timeline.push({ id: uid("phase"), phase: "", description: "", duration: "" });
    setPropDirty(true);
    renderTimeline(); renderPreview();
  });

  /* ---- Logo upload (same pattern as quotation.js) ---- */

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert(t("validation.logoTooLarge"));
      logoInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result; renderLogoPreview(); setPropDirty(true); renderPreview(); };
    reader.readAsDataURL(file);
  });
  logoRemoveBtn.addEventListener("click", () => {
    logoDataUrl = null; logoInput.value = "";
    renderLogoPreview(); setPropDirty(true); renderPreview();
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

  /* ---- Payment terms conditional field ---- */

  fields.paymentTermsType.addEventListener("change", () => {
    paymentCustomField.hidden = fields.paymentTermsType.value !== "custom";
    renderPreview();
  });

  /* ---- Project select: populate + auto-fill ---- */

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
    if (!fields.investment.value || fields.investment.value === "0") {
      fields.investment.value = formatGrouped(project.price || 0);
    }
    if (!fields.overview.value.trim()) {
      fields.overview.value = `This proposal outlines the ${project.serviceType ? project.serviceType.toLowerCase() : "project"} work for ${project.client || project.name}.`;
    }
  }

  /* ---- Business profile: shared with Quotation Generator ---- */

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

  const useLatestProfileBtn = propPanel.querySelector('[data-prop-use-latest-profile]');
  if (useLatestProfileBtn) {
    useLatestProfileBtn.addEventListener("click", () => {
      loadBusinessProfile();
      setPropDirty(true);
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

  function paymentTermsText() {
    const type = fields.paymentTermsType.value;
    if (type === "50-50") return td("proposal.paymentTerms.5050");
    if (type === "100-upfront") return td("proposal.paymentTerms.100upfront");
    if (type === "30-70") return td("proposal.paymentTerms.3070");
    return fields.paymentTermsCustom.value || "";
  }

  /* ---- Preview render ---- */

  function renderPreview() {
    const investment = parseDigits(fields.investment.value);
    if (investmentDisplayEl) investmentDisplayEl.textContent = formatIDR(investment);
    updateAccordionSummaries();

    let sectionNum = 0;
    function numberedLabel(text) {
      sectionNum += 1;
      return `<p class="quo-doc-section-label prop-doc-numbered-label"><span class="prop-doc-num">${String(sectionNum).padStart(2, "0")}</span>${escapeHtml(text)}</p>`;
    }

    const objectivesHtml = objectives.filter((o) => o.trim()).map((o) => `<div class="prop-doc-check"><span class="prop-doc-check-mark">\u2713</span><span class="prop-doc-check-text">${escapeHtml(o)}</span></div>`).join("");
    const scopeHtml = scope.map((s, i) => `
      <div class="prop-doc-scope-item">
        <span class="prop-doc-scope-num">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <p class="prop-doc-scope-title">${escapeHtml(s.title) || "\u2014"}</p>
          ${s.description ? `<p class="prop-doc-scope-desc">${escapeHtml(s.description)}</p>` : ""}
        </div>
      </div>
    `).join("");
    const deliverablesHtml = deliverables.filter((d) => d.trim()).map((d) => `<div class="prop-doc-check"><span class="prop-doc-check-mark">\u2713</span><span class="prop-doc-check-text">${escapeHtml(d)}</span></div>`).join("");
    const timelineHtml = timeline.map((phaseItem, i) => `
      <div class="prop-doc-timeline-item">
        <span>${td("doc.phase")} ${i + 1} \u2014 ${escapeHtml(phaseItem.description) || "\u2014"}</span>
        <strong>${escapeHtml(phaseItem.duration) || "\u2014"}</strong>
      </div>
    `).join("");

    // Objectives / Scope / Deliverables / Timeline / custom sections all
    // render through sectionOrder, so their document order always matches
    // whatever order the move-up/down buttons left them in.
    const builtinSectionRenderers = {
      objectives: () => (sectionEnabled.objectives && objectivesHtml) ? `${numberedLabel(td("doc.objectives"))}<div class="prop-doc-section-body">${objectivesHtml}</div>` : "",
      scope: () => (sectionEnabled.scope && scope.length) ? `${numberedLabel(td("doc.scopeOfWork"))}<div class="prop-doc-section-body">${scopeHtml}</div>` : "",
      deliverables: () => (sectionEnabled.deliverables && deliverablesHtml) ? `${numberedLabel(td("doc.deliverables"))}<div class="prop-doc-section-body">${deliverablesHtml}</div>` : "",
      timeline: () => (sectionEnabled.timeline && timeline.length) ? `${numberedLabel(td("doc.timeline"))}<div class="prop-doc-section-body">${timelineHtml}</div>` : "",
    };
    function renderCustomSectionDoc(cs) {
      if (cs.enabled === false || !cs.title.trim()) return "";
      const items = cs.items.filter((it) => it.title.trim());
      if (!items.length) return "";
      const itemsHtml = items.map((it, i) => `
        <div class="prop-doc-scope-item">
          <span class="prop-doc-scope-num">${String(i + 1).padStart(2, "0")}</span>
          <div>
            <p class="prop-doc-scope-title">${escapeHtml(it.title) || "\u2014"}</p>
            ${it.description ? `<p class="prop-doc-scope-desc">${escapeHtml(it.description)}</p>` : ""}
          </div>
        </div>
      `).join("");
      return `${numberedLabel(escapeHtml(cs.title.trim()))}<div class="prop-doc-section-body">${itemsHtml}</div>`;
    }
    const middleSectionsHtml = sectionOrder.map((key) => {
      if (builtinSectionRenderers[key]) return builtinSectionRenderers[key]();
      const cs = customSections.find((s) => s.id === key);
      return cs ? renderCustomSectionDoc(cs) : "";
    }).join("");

    // Proposal header only: address, phone, email and website all flow as
    // one line — separated by "·" — and wrap naturally once the line is
    // full, instead of each piece sitting on its own line whether or not
    // there's room for it.
    const businessAddressText = fields.businessAddress.value.trim()
      ? fields.businessAddress.value.trim().split("\n").map((line) => line.trim()).filter(Boolean).join(", ")
      : "";
    const businessInfoLine = [
      businessAddressText,
      fields.businessPhone.value.trim(),
      fields.businessEmail.value.trim(),
      fields.businessWebsite.value.trim(),
    ].filter(Boolean).join(" · ");

    previewEl.innerHTML = `
      <div class="quo-doc-head prop-doc-head">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="quo-doc-logo" alt="Logo">` : ""}
        <p class="quo-doc-business-name">${escapeHtml(fields.businessName.value) || td("doc.yourBusinessName")}</p>
        ${businessInfoLine ? `<p class="quo-doc-business-line prop-doc-business-line">${escapeHtml(businessInfoLine)}</p>` : ""}
      </div>

      <div class="quo-doc-title-row">
        <div>
          <p class="quo-doc-title prop-doc-title">${escapeHtml(fields.title.value) || td("doc.projectTitlePlaceholder")}</p>
        </div>
        <div class="quo-doc-dates">
          <p><span>${td("doc.proposalLabel")}</span>${escapeHtml(fields.proposalNumber.value)}</p>
          <p><span>${td("doc.date")}</span>${formatDateID(fields.date.value)}</p>
          <p><span>${td("doc.validUntil")}</span>${formatDateID(fields.validUntil.value)}</p>
        </div>
      </div>

      <div class="quo-doc-divider"></div>

      <p class="quo-doc-section-label">${td("doc.preparedFor")}</p>
      <p class="quo-doc-bill-name">${escapeHtml(fields.clientCompany.value) || escapeHtml(fields.clientName.value) || td("doc.clientNamePlaceholder")}</p>
      ${fields.clientCompany.value && fields.clientName.value ? `<p>${escapeHtml(fields.clientName.value)}</p>` : ""}
      ${fields.clientAddress.value.trim()
        ? fields.clientAddress.value.trim().split("\n").filter((line) => line.trim())
            .map((line) => `<p>${escapeHtml(line.trim())}</p>`).join("")
        : ""}
      ${[fields.clientEmail.value, fields.clientPhone.value].filter(Boolean).length
        ? `<p>${[fields.clientEmail.value, fields.clientPhone.value].filter(Boolean).map(escapeHtml).join(" \u00b7 ")}</p>`
        : ""}

      <div class="quo-doc-divider"></div>

      ${fields.overview.value.trim() ? `
        ${numberedLabel(td("doc.introduction"))}
        <div class="prop-doc-section-body">
          <p class="quo-doc-pre">${escapeHtml(fields.overview.value)}</p>
        </div>
      ` : ""}

      ${middleSectionsHtml}

      ${numberedLabel(td("doc.investment"))}
      <div class="prop-doc-section-body">
        <p class="prop-doc-investment">${formatIDR(investment)}</p>
        <p class="quo-doc-pre prop-doc-payment-terms">${escapeHtml(paymentTermsText())}</p>
      </div>

      ${sectionEnabled["next-steps"] && fields.nextSteps.value.trim() ? `
        ${numberedLabel(td("doc.nextSteps"))}
        <div class="prop-doc-section-body">
          <p class="quo-doc-pre">${escapeHtml(fields.nextSteps.value)}</p>
        </div>
      ` : ""}

      ${sectionEnabled.terms && fields.terms.value.trim() ? `
        ${numberedLabel(td("doc.termsConditions"))}
        <div class="prop-doc-section-body">
          <p class="quo-doc-pre">${escapeHtml(fields.terms.value)}</p>
        </div>
      ` : ""}

      ${sectionEnabled.footer && fields.footerNote.value.trim() ? `
        <div class="quo-doc-divider"></div>
        <p class="quo-doc-footer">${escapeHtml(fields.footerNote.value.trim())}</p>
      ` : ""}
    `;

    return { investment };
  }

  Object.values(fields).forEach((el) => {
    if (!el || el.dataset.currencyInput !== undefined) return;
    el.addEventListener("input", () => { setPropDirty(true); renderPreview(); });
    el.addEventListener("change", () => { setPropDirty(true); renderPreview(); });
  });

  /* ---- Validation ---- */

  function validate() {
    const problems = [];
    if (!fields.businessName.value.trim()) problems.push("Business Name wajib diisi.");
    if (!fields.clientName.value.trim()) problems.push("Client Name wajib diisi.");
    return problems;
  }
  function showValidation(problems) {
    if (!problems.length) { validationEl.hidden = true; return false; }
    validationEl.hidden = false;
    validationEl.textContent = problems.join(" ");
    return true;
  }

  /* ---- Save ---- */

  propPanel.querySelector('[data-prop-save]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) { saveFeedbackEl.hidden = true; return; }

    const { investment } = renderPreview();
    persistBusinessProfile();

    const payload = {
      proposalNumber: fields.proposalNumber.value,
      projectId: projectSelect.value || null,
      projectSnapshot: currentProjectSnapshot,
      date: fields.date.value,
      validUntil: fields.validUntil.value,
      title: fields.title.value || t("proposal.defaultTitle"),
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
      overview: fields.overview.value,
      objectives: objectives.filter((o) => o.trim()),
      scope: scope,
      deliverables: deliverables.filter((d) => d.trim()),
      timeline: timeline,
      investment,
      paymentTerms: { type: fields.paymentTermsType.value, text: paymentTermsText() },
      terms: fields.terms.value,
      nextSteps: fields.nextSteps.value,
      footerNote: fields.footerNote.value,
      sectionOrder: sectionOrder.slice(),
      customSections: customSections.map((cs) => ({
        id: cs.id,
        title: cs.title,
        enabled: cs.enabled !== false,
        items: cs.items.map((it) => ({ title: it.title, description: it.description })),
      })),
      sectionEnabled: { ...sectionEnabled },
    };

    saveFeedbackEl.classList.remove("save-feedback-error");

    if (editingProposalId) {
      const result = updateProposalWithStatus(editingProposalId, payload);
      if (result.ok) {
        saveFeedbackEl.textContent = t("proposal.updated", { number: payload.proposalNumber });
        setPropDirty(false);
      } else if (result.reason === "not_found") {
        const created = saveProposalWithStatus(payload);
        if (created.ok) {
          editingProposalId = created.record.id;
          saveFeedbackEl.textContent = t("proposal.savedAsNew", { number: payload.proposalNumber });
          setPropDirty(false);
        } else {
          saveFeedbackEl.classList.add("save-feedback-error");
          saveFeedbackEl.textContent = t("proposal.saveError.notFound");
        }
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("proposal.saveError.generic");
      }
    } else {
      const created = saveProposalWithStatus(payload);
      if (created.ok) {
        editingProposalId = created.record.id;
        saveFeedbackEl.textContent = t("proposal.saved", { number: payload.proposalNumber });
        setPropDirty(false);
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("proposal.saveError.create");
      }
    }
    saveFeedbackEl.hidden = false;
  });

  /* ---- PDF (native print, same isolated-sheet pattern as quotation.js) ---- */

  const printSheet = document.getElementById("quo-print-sheet");

  propPanel.querySelector('[data-prop-pdf]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) return;
    renderPreview();
    printSheet.innerHTML = previewEl.innerHTML;
    // iOS/iPad Safari can call print() before it has finished laying
    // out the freshly-injected sheet (images/webfonts not settled
    // yet) - that shows up as the print sheet taking a long time to
    // appear, appearing blank, or spilling onto a spurious 2nd page.
    // Waiting a couple of animation frames + document.fonts.ready
    // before printing gives layout a chance to settle first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        ready.then(() => window.print()).catch(() => window.print());
      });
    });
  });

  /* ---- Load an existing proposal ---- */

  function loadProposal(proposal) {
    editingProposalId = proposal.id;
    fields.proposalNumber.value = proposal.proposalNumber;
    fields.date.value = proposal.date;
    fields.validUntil.value = proposal.validUntil;
    fields.title.value = proposal.title || "";

    populateProjectSelect(proposal.projectId);
    currentProjectSnapshot = proposal.projectSnapshot || null;

    // Defensive fallbacks: a proposal restored from an older/partial
    // backup could be missing nested objects entirely — fall back to
    // {} so opening it shows blank fields instead of crashing the page.
    const business = proposal.business || {};
    const client = proposal.client || {};
    const paymentTerms = proposal.paymentTerms || {};

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

    fields.overview.value = proposal.overview || "";
    objectives = (proposal.objectives || []).slice();
    renderObjectives();
    scope = (proposal.scope || []).map((s) => ({ id: uid("scope"), title: s.title || "", description: s.description || "" }));
    renderScope();
    deliverables = (proposal.deliverables || []).slice();
    renderDeliverables();
    timeline = (proposal.timeline || []).map((t) => ({ id: uid("phase"), phase: t.phase || "", description: t.description || "", duration: t.duration || "" }));
    renderTimeline();

    fields.investment.value = formatGrouped(proposal.investment || 0);

    fields.paymentTermsType.value = paymentTerms.type || "50-50";
    fields.paymentTermsCustom.value = paymentTerms.type === "custom" ? paymentTerms.text : "";
    paymentCustomField.hidden = paymentTerms.type !== "custom";

    fields.nextSteps.value = proposal.nextSteps || "";
    // Older saved proposals have no footerNote at all — fall back to the
    // fixed "Thank you." text that always rendered before this was
    // editable, so nothing changes for a proposal saved before this.
    fields.footerNote.value = proposal.footerNote !== undefined ? proposal.footerNote : t("doc.thankYou");

    // Custom sections + the document order of the reorderable group. Old
    // saved proposals have neither field — fall back to no custom sections
    // and the original fixed order, exactly how it always rendered before.
    customSections = (proposal.customSections || []).map((cs) => ({
      id: cs.id || uid("section"),
      title: cs.title || "",
      enabled: cs.enabled !== false,
      items: (cs.items || []).map((it) => ({ id: uid("item"), title: it.title || "", description: it.description || "" })),
    }));
    const validKeys = new Set(["objectives", "scope", "deliverables", "timeline", ...customSections.map((s) => s.id)]);
    sectionOrder = (Array.isArray(proposal.sectionOrder) ? proposal.sectionOrder.slice() : []).filter((k) => validKeys.has(k));
    ["objectives", "scope", "deliverables", "timeline"].forEach((k) => { if (!sectionOrder.includes(k)) sectionOrder.push(k); });
    customSections.forEach((cs) => { if (!sectionOrder.includes(cs.id)) sectionOrder.push(cs.id); });
    rebuildCustomSectionsDOM();
    fields.terms.value = proposal.terms || "";

    // Older saved proposals (before this toggle existed) have no
    // sectionEnabled at all — treat that as "everything on", same as it
    // always behaved before.
    sectionEnabled = Object.fromEntries(
      SECTION_TOGGLE_KEYS.map((k) => [k, proposal.sectionEnabled ? proposal.sectionEnabled[k] !== false : true])
    );
    applySectionToggleUI();

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setPropDirty(false);
    renderPreview();
  }

  /* ---- Fresh start ---- */

  function startNew(projectId) {
    editingProposalId = null;
    objectives = [];
    scope = [];
    deliverables = [];
    timeline = [];
    logoDataUrl = null;
    currentProjectSnapshot = null;
    sectionEnabled = Object.fromEntries(SECTION_TOGGLE_KEYS.map((k) => [k, true]));
    customSections = [];
    sectionOrder = ["objectives", "scope", "deliverables", "timeline"];
    rebuildCustomSectionsDOM();
    applySectionToggleUI();

    const profileDefaults = getBusinessProfile() || {};
    const validDays = Number(profileDefaults.defaultValidUntil) || 14;

    fields.proposalNumber.value = generateProposalNumber();
    const today = new Date();
    const validDate = new Date(today.getTime() + validDays * 24 * 60 * 60 * 1000);
    fields.date.value = today.toISOString().slice(0, 10);
    fields.validUntil.value = validDate.toISOString().slice(0, 10);
    fields.title.value = t("proposal.defaultTitle");

    fields.clientName.value = "";
    fields.clientCompany.value = "";
    fields.clientEmail.value = "";
    fields.clientPhone.value = "";
    fields.clientAddress.value = "";

    fields.overview.value = "";
    fields.investment.value = "";

    fields.paymentTermsType.value = profileDefaults.defaultPaymentTerms || "50-50";
    fields.paymentTermsCustom.value = "";
    paymentCustomField.hidden = true;

    fields.nextSteps.value = t("prop.defaultNextSteps");
    fields.terms.value = t("prop.defaultTerms");
    fields.footerNote.value = t("doc.thankYou");

    loadBusinessProfile();
    populateProjectSelect(projectId);
    if (projectId) applyProjectData(projectId);

    if (!scope.length) {
      scope = [
        { id: uid("scope"), title: t("prop.defaultScope1"), description: "" },
        { id: uid("scope"), title: t("prop.defaultScope2"), description: "" },
      ];
    }
    if (!timeline.length) {
      timeline = [
        { id: uid("phase"), phase: "", description: t("prop.defaultPhase1"), duration: t("prop.defaultDuration3Days") },
        { id: uid("phase"), phase: "", description: t("prop.defaultPhase2"), duration: t("prop.defaultDuration10Days") },
      ];
    }
    if (!objectives.length) objectives = [t("prop.defaultObjective")];
    if (!deliverables.length) deliverables = [t("prop.defaultDeliverable")];

    renderObjectives();
    renderScope();
    renderDeliverables();
    renderTimeline();

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setPropDirty(true);
    renderPreview();
  }

  /* ---- MY PROPOSALS PAGE ---- */

  let myrSearchTerm = "";
  let myrStatusFilter = "all";
  let myrSortOrder = "updated-desc";
  const myrPanel = document.querySelector('[data-myr-panel]');
  const myrSearchInput = document.querySelector('[data-myr-search]');
  const myrFilterSelect = document.querySelector('[data-myr-filter]');
  const myrSortSelect = document.querySelector('[data-myr-sort]');

  function getFilteredProposals() {
    const term = myrSearchTerm.trim().toLowerCase();
    const list = getSavedProposals().filter((p) => {
      const matchesStatus = myrStatusFilter === "all" || p.status === myrStatusFilter;
      const clientName = (p.client && p.client.name) || "";
      const clientCompany = (p.client && p.client.company) || "";
      const matchesSearch = !term ||
        (p.proposalNumber || "").toLowerCase().includes(term) ||
        (p.title || "").toLowerCase().includes(term) ||
        clientName.toLowerCase().includes(term) ||
        clientCompany.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });

    return list.slice().sort((a, b) => {
      switch (myrSortOrder) {
        case "updated-asc": return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "value-desc": return (Number(b.investment) || 0) - (Number(a.investment) || 0);
        case "value-asc": return (Number(a.investment) || 0) - (Number(b.investment) || 0);
        case "name-asc": return (a.title || "").localeCompare(b.title || "");
        case "updated-desc":
        default: return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }

  function renderMyProposalsSummary() {
    const el = document.querySelector('[data-myr-summary]');
    if (!el) return;
    const all = getSavedProposals();
    if (!all.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;

    const totalValue = all.reduce((sum, p) => sum + (Number(p.investment) || 0), 0);
    const accepted = all.filter((p) => p.status === "accepted").length;
    const drafts = all.filter((p) => p.status === "draft").length;

    el.innerHTML = `
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Proposals</span>
        <span class="myp-summary-value">${all.length}</span>
      </div>
      <div class="myp-summary-divider"></div>
      <div class="myp-summary-item">
        <span class="myp-summary-label">Total Proposal Value</span>
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

  function buildProposalStatusSelect(p) {
    const options = PROPOSAL_STATUS_ORDER.map((key) => {
      const meta = getProposalStatusMeta(key);
      return `<option value="${key}"${p.status === key ? " selected" : ""}>${meta.label}</option>`;
    }).join("");
    return `<select class="status-select" data-myr-status="${p.id}">${options}</select>`;
  }

  function myrRowMenuHTML(id) {
    return `
      <div class="row-menu" data-row-menu>
        <button type="button" class="icon-btn row-menu-trigger" data-row-menu-trigger aria-label="Actions" aria-haspopup="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="12.8" r="1.15" fill="currentColor"/></svg>
        </button>
        <div class="row-menu-dropdown" data-row-menu-dropdown hidden>
          <button type="button" class="row-menu-item" data-myr-open="${id}">${t("action.open")}</button>
          <button type="button" class="row-menu-item" data-myr-download="${id}">${t("action.exportPdf")}</button>
          <button type="button" class="row-menu-item row-menu-item-danger" data-myr-delete="${id}">${t("action.delete")}</button>
        </div>
      </div>`;
  }

  function wireMyrRowMenus(panel) {
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

    panel.querySelectorAll('[data-myr-open]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = getProposalById(btn.dataset.myrOpen);
        if (!p) return;
        loadProposal(p);
        navigateTo("proposal-generator");
        history.replaceState(null, "", "#proposal-generator");
      });
    });
    panel.querySelectorAll('[data-myr-download]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = getProposalById(btn.dataset.myrDownload);
        if (!p) return;
        loadProposal(p);
        navigateTo("proposal-generator");
        history.replaceState(null, "", "#proposal-generator");
        setTimeout(() => document.querySelector('[data-prop-pdf]').click(), 150);
      });
    });
    panel.querySelectorAll('[data-myr-delete]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteConfirm(btn.dataset.myrDelete, { type: "proposal" });
      });
    });
  }

  function renderMyProposalsPage() {
    if (!myrPanel) return;
    renderMyProposalsSummary();
    const all = getSavedProposals();
    const filtered = getFilteredProposals();

    if (!all.length) {
      myrPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5h16M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5M4 8.5l2-4h12l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <h3 class="empty-title">${t("emptyState.proposals.title")}</h3>
          <p class="empty-text">${t("emptyState.proposals.text")}</p>
          <button class="btn btn-primary" data-myr-empty-cta>${t("emptyState.proposals.cta")}</button>
        </div>`;
      myrPanel.querySelector('[data-myr-empty-cta]').addEventListener("click", () => {
        startNew(null);
        navigateTo("proposal-generator");
        history.replaceState(null, "", "#proposal-generator");
      });
      return;
    }

    if (!filtered.length) {
      myrPanel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <h3 class="empty-title">No matching proposals</h3>
          <p class="empty-text">Coba ubah kata kunci pencarian atau filter status.</p>
        </div>`;
      return;
    }

    const rows = filtered.map((p) => {
      return `
      <tr data-myr-row="${p.id}">
        <td class="cell-project">
          <p class="cell-project-name">${escapeHtml(p.proposalNumber || "\u2014")}</p>
          ${p.title ? `<p class="cell-project-sub">${escapeHtml(p.title)}</p>` : ""}
        </td>
        <td class="cell-client">${escapeHtml((p.client && (p.client.company || p.client.name)) || "\u2014")}</td>
        <td class="cell-price num">${formatIDR(p.investment)}</td>
        <td>${buildProposalStatusSelect(p)}</td>
        <td class="cell-updated">${formatRelativeDate(p.updatedAt)}</td>
        <td class="myp-row-actions">${myrRowMenuHTML(p.id)}</td>
      </tr>`;
    }).join("");

    const cards = filtered.map((p) => {
      const status = getProposalStatusMeta(p.status);
      return `
      <div class="project-card-item" data-myr-row="${p.id}">
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(p.proposalNumber || "\u2014")}</p>
            <p class="project-card-client">${escapeHtml((p.client && (p.client.company || p.client.name)) || "\u2014")}${p.title ? " \u00b7 " + escapeHtml(p.title) : ""}</p>
          </div>
          <span class="badge ${status.badgeClass}">${status.label}</span>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-price">${formatIDR(p.investment)}</span>
          <span class="project-card-updated">${formatRelativeDate(p.updatedAt)}</span>
        </div>
        <div class="myp-card-actions">${myrRowMenuHTML(p.id)}</div>
      </div>`;
    }).join("");

    myrPanel.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>${t("table.proposal")}</th><th>${t("table.client")}</th><th class="num">${t("table.value")}</th><th>${t("table.status")}</th><th>${t("table.updated")}</th><th>${t("table.actions")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="project-cards">${cards}</div>
    `;

    wireMyrRowMenus(myrPanel);

    myrPanel.querySelectorAll('[data-myr-status]').forEach((sel) => {
      sel.addEventListener("change", (e) => {
        updateProposalStatus(sel.dataset.myrStatus, e.target.value);
        renderMyProposalsPage();
      });
    });
  }

  if (myrSearchInput) {
    myrSearchInput.addEventListener("input", () => { myrSearchTerm = myrSearchInput.value; renderMyProposalsPage(); });
  }
  if (myrFilterSelect) {
    myrFilterSelect.addEventListener("change", () => { myrStatusFilter = myrFilterSelect.value; renderMyProposalsPage(); });
  }
  if (myrSortSelect) {
    myrSortSelect.addEventListener("change", () => { myrSortOrder = myrSortSelect.value; renderMyProposalsPage(); });
  }

  window.FreelanceProposal = { startNew, loadProposal, renderMyProposalsPage };

  // Document Language (Settings) can change independently of the UI
  // language - redraw this proposal's live preview immediately, no reload.
  window.addEventListener("freelance-doc-language-changed", () => { if (typeof renderPreview === "function") renderPreview(); });

  /* ---- Init ---- */

  startNew(null);
}
