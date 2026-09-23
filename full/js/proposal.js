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

  function accordionSummary(key, text) {
    const el = propPanel.querySelector(`[data-accordion-summary="${key}"]`);
    if (el) el.textContent = text;
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
      return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
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
          <button type="button" class="quo-item-remove" data-objective-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      objectivesContainer.querySelectorAll('[data-idx]').forEach((row) => {
        const i = Number(row.dataset.idx);
        row.querySelector('[data-objective-input]').addEventListener("input", (e) => { objectives[i] = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-objective-remove]').addEventListener("click", () => { objectives.splice(i, 1); setPropDirty(true); renderObjectives(); renderPreview(); });
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
          <button type="button" class="quo-item-remove" data-deliverable-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      deliverablesContainer.querySelectorAll('[data-idx]').forEach((row) => {
        const i = Number(row.dataset.idx);
        row.querySelector('[data-deliverable-input]').addEventListener("input", (e) => { deliverables[i] = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-deliverable-remove]').addEventListener("click", () => { deliverables.splice(i, 1); setPropDirty(true); renderDeliverables(); renderPreview(); });
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
          <button type="button" class="quo-item-remove" data-scope-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      scopeContainer.querySelectorAll('[data-id]').forEach((row) => {
        const item = scope.find((s) => s.id === row.dataset.id);
        row.querySelector('[data-scope-title]').addEventListener("input", (e) => { item.title = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-scope-desc]').addEventListener("input", (e) => { item.description = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-scope-remove]').addEventListener("click", () => {
          scope = scope.filter((s) => s.id !== item.id);
          setPropDirty(true);
          renderScope(); renderPreview();
        });
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
          <button type="button" class="quo-item-remove" data-timeline-remove aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join("");
      timelineContainer.querySelectorAll('[data-id]').forEach((row) => {
        const item = timeline.find((t) => t.id === row.dataset.id);
        row.querySelector('[data-timeline-desc]').addEventListener("input", (e) => { item.description = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-timeline-duration]').addEventListener("input", (e) => { item.duration = e.target.value; setPropDirty(true); renderPreview(); });
        row.querySelector('[data-timeline-remove]').addEventListener("click", () => {
          timeline = timeline.filter((t) => t.id !== item.id);
          setPropDirty(true);
          renderTimeline(); renderPreview();
        });
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
    if (type === "50-50") return t("proposal.paymentTerms.5050");
    if (type === "100-upfront") return t("proposal.paymentTerms.100upfront");
    if (type === "30-70") return t("proposal.paymentTerms.3070");
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

    const objectivesHtml = objectives.filter((o) => o.trim()).map((o) => `<div class="prop-doc-check">\u2713 ${escapeHtml(o)}</div>`).join("");
    const scopeHtml = scope.map((s, i) => `
      <div class="prop-doc-scope-item">
        <span class="prop-doc-scope-num">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <p class="prop-doc-scope-title">${escapeHtml(s.title) || "\u2014"}</p>
          ${s.description ? `<p class="prop-doc-scope-desc">${escapeHtml(s.description)}</p>` : ""}
        </div>
      </div>
    `).join("");
    const deliverablesHtml = deliverables.filter((d) => d.trim()).map((d) => `<div class="prop-doc-check">\u2713 ${escapeHtml(d)}</div>`).join("");
    const timelineHtml = timeline.map((phaseItem, i) => `
      <div class="prop-doc-timeline-item">
        <span>${t("doc.phase")} ${i + 1} \u2014 ${escapeHtml(phaseItem.description) || "\u2014"}</span>
        <strong>${escapeHtml(phaseItem.duration) || "\u2014"}</strong>
      </div>
    `).join("");

    const businessLines = [];
    if (fields.businessAddress.value.trim()) {
      fields.businessAddress.value.trim().split("\n").forEach((line) => { if (line.trim()) businessLines.push(line.trim()); });
    }
    if (fields.businessEmail.value.trim()) businessLines.push(fields.businessEmail.value.trim());
    if (fields.businessPhone.value.trim()) businessLines.push(fields.businessPhone.value.trim());
    if (fields.businessWebsite.value.trim()) businessLines.push(fields.businessWebsite.value.trim());

    previewEl.innerHTML = `
      <div class="quo-doc-head">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="quo-doc-logo" alt="Logo">` : ""}
        <p class="quo-doc-business-name">${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
        ${businessLines.map((line) => `<p class="quo-doc-business-line">${escapeHtml(line)}</p>`).join("")}
      </div>

      <p class="prop-doc-kicker">${t("doc.projectProposalKicker")}</p>
      <div class="quo-doc-title-row">
        <div>
          <p class="quo-doc-title prop-doc-title">${escapeHtml(fields.title.value) || t("doc.projectTitlePlaceholder")}</p>
        </div>
        <div class="quo-doc-dates">
          <p><span>${t("doc.proposalLabel")}</span>${escapeHtml(fields.proposalNumber.value)}</p>
          <p><span>${t("doc.date")}</span>${formatDateID(fields.date.value)}</p>
          <p><span>${t("doc.validUntil")}</span>${formatDateID(fields.validUntil.value)}</p>
        </div>
      </div>

      <div class="quo-doc-divider"></div>

      <p class="quo-doc-section-label">${t("doc.preparedFor")}</p>
      <p class="quo-doc-bill-name">${escapeHtml(fields.clientCompany.value) || escapeHtml(fields.clientName.value) || t("doc.clientNamePlaceholder")}</p>
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
        ${numberedLabel(t("doc.introduction"))}
        <p class="quo-doc-pre">${escapeHtml(fields.overview.value)}</p>
      ` : ""}

      ${objectivesHtml ? `${numberedLabel(t("doc.objectives"))}${objectivesHtml}` : ""}

      ${scope.length ? `${numberedLabel(t("doc.scopeOfWork"))}${scopeHtml}` : ""}

      ${deliverablesHtml ? `${numberedLabel(t("doc.deliverables"))}${deliverablesHtml}` : ""}

      ${timeline.length ? `${numberedLabel(t("doc.timeline"))}${timelineHtml}` : ""}

      ${numberedLabel(t("doc.investment"))}
      <p class="prop-doc-investment">${formatIDR(investment)}</p>
      <p class="quo-doc-pre prop-doc-payment-terms">${escapeHtml(paymentTermsText())}</p>

      ${fields.nextSteps.value.trim() ? `
        ${numberedLabel(t("doc.nextSteps"))}
        <p class="quo-doc-pre">${escapeHtml(fields.nextSteps.value)}</p>
      ` : ""}

      ${fields.terms.value.trim() ? `
        ${numberedLabel(t("doc.termsConditions"))}
        <p class="quo-doc-pre">${escapeHtml(fields.terms.value)}</p>
      ` : ""}

      <div class="quo-doc-divider"></div>
      <p class="quo-doc-footer">${t("doc.thankYou")} \u2014 ${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
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
    window.print();
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
    fields.terms.value = proposal.terms || "";

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

  /* ---- Init ---- */

  startNew(null);
}
