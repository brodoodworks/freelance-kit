/* ==========================================================================
   CALCULATOR.JS
   Pricing Calculator page logic: reads the form, computes the
   recommended price in realtime, renders the breakdown/profit
   analysis/health badge, and saves a project to localStorage. Self
   contained — only touches elements inside [data-page-panel="pricing-calculator"].
   ========================================================================== */

// Used by the Reset button, first load, and any fresh "New Project"
// entry point — form starts genuinely empty until the user fills it in.
const CALC_EMPTY = {
  name: "",
  serviceType: "",
  hours: 0,
  hourlyRate: 0,
  additionalExpenses: 0,
  revisions: 0,
  additionalRevisionFee: 0,
  expectedAdditionalRevisions: 0,
  riskBuffer: 0,
  profitMargin: 0,
};

const calcPanel = document.querySelector('[data-page-panel="pricing-calculator"]');

// Only wire everything up if the panel actually exists in this build.
if (calcPanel) {

  const fields = {
    name: calcPanel.querySelector('[data-calc="name"]'),
    serviceType: calcPanel.querySelector('[data-calc="serviceType"]'),
    hours: calcPanel.querySelector('[data-calc="hours"]'),
    hourlyRate: calcPanel.querySelector('[data-calc="hourlyRate"]'),
    additionalExpenses: calcPanel.querySelector('[data-calc="additionalExpenses"]'),
    revisions: calcPanel.querySelector('[data-calc="revisions"]'),
    additionalRevisionFee: calcPanel.querySelector('[data-calc="additionalRevisionFee"]'),
    expectedAdditionalRevisions: calcPanel.querySelector('[data-calc="expectedAdditionalRevisions"]'),
    riskBuffer: calcPanel.querySelector('[data-calc="riskBuffer"]'),
    profitMargin: calcPanel.querySelector('[data-calc="profitMargin"]'),
  };

  const riskValueEl = calcPanel.querySelector('[data-calc-value="riskBuffer"]');
  const marginValueEl = calcPanel.querySelector('[data-calc-value="profitMargin"]');
  const resultPriceEl = calcPanel.querySelector('[data-result-price]');
  const resultRangeEl = calcPanel.querySelector('[data-result-range]');
  const breakdownEl = calcPanel.querySelector('[data-result-breakdown]');
  const profitValueEl = calcPanel.querySelector('[data-profit-value]');
  const profitMarginEl = calcPanel.querySelector('[data-profit-margin]');
  const hourlyEarningsEl = calcPanel.querySelector('[data-hourly-earnings]');
  const healthBadgeEl = calcPanel.querySelector('[data-health-badge]');
  const healthNoteEl = calcPanel.querySelector('[data-health-note]');
  const saveFeedbackEl = calcPanel.querySelector('[data-calc-save-feedback]');
  const saveBtn = calcPanel.querySelector('[data-calc-save]');

  // Set by loadProject() when arriving here via "Edit Pricing" from a
  // Project Detail — makes Save update that project instead of
  // creating a new one. Cleared by resetToDefaults()/a fresh "New
  // Project" entry point.
  let editingProjectId = null;
  let editingClient = "";

  /* ---- Currency inputs: type digits, display grouped thousands ---- */

  function parseDigits(value) {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function formatGrouped(number) {
    return (number || number === 0) ? number.toLocaleString("id-ID") : "";
  }

  calcPanel.querySelectorAll('[data-currency-input]').forEach((input) => {
    input.addEventListener("input", () => {
      const raw = parseDigits(input.value);
      input.value = formatGrouped(raw);
      recalculate();
    });
  });

  /* ---- Non-currency inputs just recalc live ---- */

  [fields.name, fields.serviceType, fields.hours, fields.revisions, fields.expectedAdditionalRevisions]
    .forEach((el) => el && el.addEventListener("input", recalculate));

  fields.riskBuffer.addEventListener("input", () => {
    riskValueEl.textContent = `${fields.riskBuffer.value}%`;
    recalculate();
  });
  fields.profitMargin.addEventListener("input", () => {
    marginValueEl.textContent = `${fields.profitMargin.value}%`;
    recalculate();
  });

  /* ---- Read current form state as numbers ---- */

  function readState() {
    return {
      name: fields.name.value.trim(),
      serviceType: fields.serviceType.value,
      hours: Math.max(0, Number(fields.hours.value) || 0),
      hourlyRate: parseDigits(fields.hourlyRate.value),
      additionalExpenses: parseDigits(fields.additionalExpenses.value),
      revisions: Math.max(0, Number(fields.revisions.value) || 0),
      additionalRevisionFee: parseDigits(fields.additionalRevisionFee.value),
      expectedAdditionalRevisions: Math.max(0, Number(fields.expectedAdditionalRevisions.value) || 0),
      riskBuffer: Math.min(50, Math.max(0, Number(fields.riskBuffer.value) || 0)),
      profitMargin: Math.min(95, Math.max(0, Number(fields.profitMargin.value) || 0)),
    };
  }

  /* ---- Core calculation ---- */

  function calculate(state) {
    const laborCost = state.hours * state.hourlyRate;
    const revisionCost = state.expectedAdditionalRevisions * state.additionalRevisionFee;
    const baseCost = laborCost + state.additionalExpenses + revisionCost;
    const riskBufferAmount = baseCost * (state.riskBuffer / 100);
    const costAfterBuffer = baseCost + riskBufferAmount;

    const marginDecimal = Math.min(state.profitMargin, 95) / 100;
    const recommendedPrice = marginDecimal >= 1 ? costAfterBuffer : costAfterBuffer / (1 - marginDecimal);

    const profit = recommendedPrice - costAfterBuffer;
    const hourlyEarnings = state.hours > 0 ? recommendedPrice / state.hours : null;

    return {
      laborCost, revisionCost, baseCost, riskBufferAmount, costAfterBuffer,
      recommendedPrice, profit, hourlyEarnings,
    };
  }

  /* ---- Pricing health badge ---- */

  function getHealth(state) {
    if (state.profitMargin < 15) {
      return { label: t("calc.health.lowMargin.label"), cls: "health-warning", note: t("calc.health.lowMargin.note") };
    }
    if (state.riskBuffer > 30) {
      return { label: t("calc.health.highRisk.label"), cls: "health-error", note: t("calc.health.highRisk.note") };
    }
    return { label: t("calc.health.healthy.label"), cls: "health-success", note: t("calc.health.healthy.note") };
  }

  function setNeutralHealth() {
    healthBadgeEl.textContent = "\u2014";
    healthBadgeEl.className = "health-badge health-neutral";
    healthNoteEl.textContent = t("calc.health.neutral.note");
  }

  /* ---- Render ---- */

  function renderBreakdown(state, r) {
    const groups = [
      {
        rows: [
          [t("calc.breakdown.workingHours"), t("calc.breakdown.hoursValue", { hours: state.hours })],
          [t("calc.breakdown.laborCost"), formatIDR(r.laborCost)],
          [t("calc.breakdown.additionalExpenses"), formatIDR(state.additionalExpenses)],
          [t("calc.breakdown.additionalRevision"), formatIDR(r.revisionCost)],
        ],
      },
      {
        rows: [
          [t("calc.breakdown.baseCost"), formatIDR(r.baseCost)],
          [t("calc.breakdown.riskBuffer", { percent: state.riskBuffer }), formatIDR(r.riskBufferAmount)],
        ],
        emphasize: [
          [t("calc.breakdown.totalProjectCost"), formatIDR(r.costAfterBuffer)],
        ],
      },
      {
        emphasize: [
          [t("calc.breakdown.profit"), formatIDR(r.profit)],
          [t("calc.profitMargin"), `${state.profitMargin}%`],
        ],
      },
    ];

    breakdownEl.innerHTML = groups.map((g) => `
      <div class="breakdown-group">
        ${(g.rows || []).map(([label, value]) => `
          <div class="breakdown-row">
            <span>${label}</span>
            <span class="breakdown-value">${value}</span>
          </div>
        `).join("")}
        ${(g.emphasize || []).map(([label, value]) => `
          <div class="breakdown-row breakdown-row-emphasis">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    `).join("");
  }

  function recalculate() {
    const state = readState();
    const r = calculate(state);

    resultPriceEl.textContent = formatIDR(r.recommendedPrice);
    resultRangeEl.textContent = `${formatIDR(r.recommendedPrice * 0.95)} \u2013 ${formatIDR(r.recommendedPrice * 1.10)}`;

    renderBreakdown(state, r);

    profitValueEl.textContent = formatIDR(r.profit);
    profitMarginEl.textContent = `${state.profitMargin}%`;
    hourlyEarningsEl.textContent = r.hourlyEarnings === null ? "\u2013" : `${formatIDR(r.hourlyEarnings)}${t("unit.perHour")}`;

    const health = getHealth(state);
    healthBadgeEl.textContent = health.label;
    healthBadgeEl.className = `health-badge ${health.cls}`;
    healthNoteEl.textContent = health.note;

    return { state, r };
  }

  /* ---- Set form values (used by init + reset) ---- */

  function applyValues(values) {
    fields.name.value = values.name;
    fields.serviceType.value = values.serviceType;
    fields.hours.value = values.hours;
    fields.hourlyRate.value = formatGrouped(values.hourlyRate);
    fields.additionalExpenses.value = formatGrouped(values.additionalExpenses);
    fields.revisions.value = values.revisions;
    fields.additionalRevisionFee.value = formatGrouped(values.additionalRevisionFee);
    fields.expectedAdditionalRevisions.value = values.expectedAdditionalRevisions;
    fields.riskBuffer.value = values.riskBuffer;
    fields.profitMargin.value = values.profitMargin;
    riskValueEl.textContent = `${values.riskBuffer}%`;
    marginValueEl.textContent = `${values.profitMargin}%`;
    recalculate();
  }

  /* ---- Buttons ---- */

  calcPanel.querySelector('[data-calc-calculate]').addEventListener("click", () => {
    recalculate();
  });

  calcPanel.querySelector('[data-calc-reset]').addEventListener("click", () => {
    // Route through the same full reset used by "New Project" — not a
    // partial reset. If this only cleared the visible fields while
    // still editing a saved project (editingProjectId left set),
    // clicking Save afterward would overwrite that real project with
    // blank/zero values. Always fully exit edit mode on Reset.
    resetToDefaults();
  });

  calcPanel.querySelector('[data-calc-save]').addEventListener("click", () => {
    const { state, r } = recalculate();
    const name = state.name || "Untitled Project";

    const calculationBreakdown = {
      laborCost: r.laborCost,
      additionalExpenses: state.additionalExpenses,
      revisionCost: r.revisionCost,
      baseCost: r.baseCost,
      riskBufferAmount: r.riskBufferAmount,
      totalCost: r.costAfterBuffer,
      profit: r.profit,
      hourlyEarnings: r.hourlyEarnings,
    };

    const payload = {
      name,
      serviceType: state.serviceType,
      price: Math.round(r.recommendedPrice),
      workingHours: state.hours,
      hourlyRate: state.hourlyRate,
      additionalExpenses: state.additionalExpenses,
      includedRevisions: state.revisions,
      additionalRevisionFee: state.additionalRevisionFee,
      expectedAdditionalRevisions: state.expectedAdditionalRevisions,
      riskBuffer: state.riskBuffer,
      profitMargin: state.profitMargin,
      calculationBreakdown,
    };

    saveFeedbackEl.classList.remove("save-feedback-error");

    if (editingProjectId) {
      const result = updateProjectWithStatus(editingProjectId, { ...payload, client: editingClient });
      if (result.ok) {
        saveFeedbackEl.textContent = t("calc.updated", { name });
      } else if (result.reason === "not_found") {
        // The project we thought we were editing is genuinely gone
        // (deleted in another tab/action) — fall back to saving as a
        // new project instead of silently losing the person's current
        // input. This fallback create can itself fail (storage full,
        // etc.), so its own success is checked before claiming saved.
        const created = saveProjectWithStatus({ ...payload, client: "", status: "draft" });
        if (created.ok) {
          editingProjectId = created.record.id;
          editingClient = "";
          saveBtn.textContent = t("calc.updateProjectBtn");
          saveFeedbackEl.textContent = t("calc.savedAsNew", { name });
        } else {
          saveFeedbackEl.classList.add("save-feedback-error");
          saveFeedbackEl.textContent = t("calc.saveError.notFound");
        }
      } else {
        // Storage rejected the update itself — never claim success or
        // silently create a duplicate; the person's edits are still on
        // screen and unsaved, so they can retry or free up space.
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("calc.saveError.generic");
      }
    } else {
      const created = saveProjectWithStatus({ ...payload, client: "", status: "draft" });
      if (created.ok) {
        editingProjectId = created.record.id;
        editingClient = "";
        saveBtn.textContent = t("calc.updateProjectBtn");
        saveFeedbackEl.textContent = t("calc.saved", { name });
      } else {
        saveFeedbackEl.classList.add("save-feedback-error");
        saveFeedbackEl.textContent = t("calc.saveError.create");
      }
    }

    saveFeedbackEl.hidden = false;
  });

  /* ---- Edit mode: prefill from an existing saved project ---- */

  function loadProject(project) {
    editingProjectId = project.id;
    editingClient = project.client || "";
    saveBtn.textContent = t("calc.updateProjectBtn");
    saveFeedbackEl.hidden = true;
    applyValues({
      name: project.name || "",
      serviceType: project.serviceType || "",
      hours: project.workingHours || 0,
      hourlyRate: project.hourlyRate || 0,
      additionalExpenses: project.additionalExpenses || 0,
      revisions: project.includedRevisions || 0,
      additionalRevisionFee: project.additionalRevisionFee || 0,
      expectedAdditionalRevisions: project.expectedAdditionalRevisions || 0,
      riskBuffer: project.riskBuffer || 0,
      profitMargin: project.profitMargin || 0,
    });
  }

  function resetToDefaults() {
    editingProjectId = null;
    editingClient = "";
    saveBtn.textContent = t("calc.saveToProjectBtn");
    saveFeedbackEl.hidden = true;
    applyValues(CALC_EMPTY);
    setNeutralHealth();
  }

  window.FreelanceCalculator = { loadProject, resetToDefaults };

  /* ---- Init genuinely empty — no demo data on first load ---- */

  applyValues(CALC_EMPTY);
  setNeutralHealth();
}

