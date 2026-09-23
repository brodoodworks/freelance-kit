/* ==========================================================================
   PROJECTS.JS
   My Projects page (search + filter + table/cards + empty state),
   Project Detail modal (status change, client edit, edit pricing,
   delete), and the shared Delete confirmation modal. Everything here
   reads/writes through the data-layer helpers in data.js — no direct
   localStorage access.
   ========================================================================== */

let mypSearchTerm = "";
let mypStatusFilter = "all";
let pendingDeleteId = null;
let pendingDeleteFromDetail = false;

// Every other generator/list file in this app escapes user-entered text
// before interpolating it into innerHTML; this file previously didn't,
// which meant a project name/client containing HTML (even accidentally,
// e.g. "<Design & Dev>") could break rendering or, with something like
// "<script>", actually execute. Same pattern used everywhere else.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------------------------------------------------------
   MY PROJECTS PAGE
   --------------------------------------------------------------------- */

let mypSortOrder = "updated-desc";

function formatRelativeDate(isoString) {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch (err) {
    return "";
  }
}

function getFilteredMyProjects() {
  const term = mypSearchTerm.trim().toLowerCase();
  const list = getSavedProjects().filter((p) => {
    const matchesStatus = mypStatusFilter === "all" || p.status === mypStatusFilter;
    const matchesSearch = !term ||
      (p.name || "").toLowerCase().includes(term) ||
      (p.client || "").toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return list.slice().sort((a, b) => {
    switch (mypSortOrder) {
      case "updated-asc": return new Date(a.updatedAt) - new Date(b.updatedAt);
      case "price-desc": return (Number(b.price) || 0) - (Number(a.price) || 0);
      case "price-asc": return (Number(a.price) || 0) - (Number(b.price) || 0);
      case "name-asc": return (a.name || "").localeCompare(b.name || "");
      case "updated-desc":
      default: return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });
}

/* ---------------------------------------------------------------------
   PROJECT SUMMARY — compact, real-data-only. "Total Estimated Value" is
   the sum of every saved project's price regardless of status (the
   pipeline total); Dashboard's "Total Revenue" is a different, narrower
   figure (approved/completed only) — these are intentionally distinct.
   --------------------------------------------------------------------- */

function renderMyProjectsSummary() {
  const el = document.querySelector('[data-myp-summary]');
  if (!el) return;

  const all = getSavedProjects();
  if (!all.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;

  const totalValue = all.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const mostRecent = all.reduce((latest, p) => {
    return (!latest || new Date(p.updatedAt) > new Date(latest.updatedAt)) ? p : latest;
  }, null);

  el.innerHTML = `
    <div class="myp-summary-item">
      <span class="myp-summary-label">${t("myProjects.summary.totalProjects")}</span>
      <span class="myp-summary-value">${all.length}</span>
    </div>
    <div class="myp-summary-divider"></div>
    <div class="myp-summary-item">
      <span class="myp-summary-label">${t("myProjects.summary.totalEstimatedValue")}</span>
      <span class="myp-summary-value">${formatIDR(totalValue)}</span>
    </div>
    <div class="myp-summary-divider"></div>
    <div class="myp-summary-item">
      <span class="myp-summary-label">${t("myProjects.summary.lastUpdated")}</span>
      <span class="myp-summary-value">${mostRecent ? formatRelativeDate(mostRecent.updatedAt) : "\u2014"}</span>
    </div>
  `;
}

function editProjectPricing(id) {
  const fresh = getProjectById(id);
  if (window.FreelanceCalculator && fresh) window.FreelanceCalculator.loadProject(fresh);
  navigateTo("pricing-calculator");
  history.replaceState(null, "", "#pricing-calculator");
}

function rowMenuHTML(id) {
  return `
    <div class="row-menu" data-row-menu>
      <button type="button" class="icon-btn row-menu-trigger" data-row-menu-trigger aria-label="Actions" aria-haspopup="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="12.8" r="1.15" fill="currentColor"/></svg>
      </button>
      <div class="row-menu-dropdown" data-row-menu-dropdown hidden>
        <button type="button" class="row-menu-item" data-myp-open="${id}">${t("action.open")}</button>
        <button type="button" class="row-menu-item" data-myp-edit="${id}">${t("action.editPricing")}</button>
        <button type="button" class="row-menu-item row-menu-item-danger" data-myp-delete="${id}">${t("action.delete")}</button>
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

  panel.querySelectorAll('[data-myp-open]').forEach((btn) => {
    btn.addEventListener("click", () => openProjectDetail(btn.dataset.mypOpen));
  });
  panel.querySelectorAll('[data-myp-edit]').forEach((btn) => {
    btn.addEventListener("click", () => editProjectPricing(btn.dataset.mypEdit));
  });
  panel.querySelectorAll('[data-myp-delete]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDeleteConfirm(btn.dataset.mypDelete);
    });
  });
}

function renderMyProjectsPage() {
  const panel = document.querySelector('[data-myp-panel]');
  if (!panel) return;

  renderMyProjectsSummary();

  const all = getSavedProjects();
  const filtered = getFilteredMyProjects();

  if (!all.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5h16M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5M4 8.5l2-4h12l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="empty-title">No projects yet</h3>
        <p class="empty-text">Start your first pricing calculation and save it as a project.</p>
        <button class="btn btn-primary" data-myp-empty-cta>Calculate First Project</button>
      </div>`;
    panel.querySelector('[data-myp-empty-cta]').addEventListener("click", () => {
      if (window.FreelanceCalculator) window.FreelanceCalculator.resetToDefaults();
      navigateTo("pricing-calculator");
      history.replaceState(null, "", "#pricing-calculator");
    });
    return;
  }

  if (!filtered.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </div>
        <h3 class="empty-title">No matching projects</h3>
        <p class="empty-text">Coba ubah kata kunci pencarian atau filter status.</p>
      </div>`;
    return;
  }

  const rows = filtered.map((p) => {
    const status = getStatusMeta(p.status);
    return `
      <tr data-myp-row="${p.id}">
        <td class="cell-project">
          <p class="cell-project-name">${escapeHtml(p.name)}</p>
          <p class="cell-project-sub">${escapeHtml(p.serviceType) || "\u2014"}</p>
        </td>
        <td class="cell-client">${escapeHtml(p.client) || "\u2014"}</td>
        <td class="cell-price num">${formatIDR(p.price)}</td>
        <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
        <td class="cell-updated">${formatRelativeDate(p.updatedAt)}</td>
        <td class="myp-row-actions">${rowMenuHTML(p.id)}</td>
      </tr>`;
  }).join("");

  const cards = filtered.map((p) => {
    const status = getStatusMeta(p.status);
    return `
      <div class="project-card-item" data-myp-row="${p.id}">
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(p.name)}</p>
            <p class="project-card-client">${escapeHtml(p.client) || "\u2014"} \u00b7 ${escapeHtml(p.serviceType) || "\u2014"}</p>
          </div>
          <span class="badge ${status.badgeClass}">${status.label}</span>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-price">${formatIDR(p.price)}</span>
          <span class="project-card-updated">${formatRelativeDate(p.updatedAt)}</span>
        </div>
        <div class="myp-card-actions">${rowMenuHTML(p.id)}</div>
      </div>`;
  }).join("");

  panel.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>${t("myProjects.table.project")}</th>
          <th>${t("myProjects.table.client")}</th>
          <th class="num">${t("myProjects.table.projectValue")}</th>
          <th>${t("myProjects.table.status")}</th>
          <th>${t("myProjects.table.lastUpdated")}</th>
          <th>${t("myProjects.table.actions")}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="project-cards">${cards}</div>
  `;

  wireRowMenus(panel);
}

const mypSearchInput = document.querySelector('[data-myp-search]');
const mypFilterSelect = document.querySelector('[data-myp-filter]');
const mypSortSelect = document.querySelector('[data-myp-sort]');
if (mypSearchInput) {
  mypSearchInput.addEventListener("input", () => {
    mypSearchTerm = mypSearchInput.value;
    renderMyProjectsPage();
  });
}
if (mypFilterSelect) {
  mypFilterSelect.addEventListener("change", () => {
    mypStatusFilter = mypFilterSelect.value;
    renderMyProjectsPage();
  });
}
if (mypSortSelect) {
  mypSortSelect.addEventListener("change", () => {
    mypSortOrder = mypSortSelect.value;
    renderMyProjectsPage();
  });
}

/* ---------------------------------------------------------------------
   PROJECT DETAIL MODAL
   --------------------------------------------------------------------- */

const detailOverlay = document.querySelector('[data-detail-overlay]');
const detailBody = document.querySelector('[data-detail-body]');

function buildStatusSelect(project) {
  const options = STATUS_ORDER.map((key) => {
    const meta = getStatusMeta(key);
    return `<option value="${key}"${project.status === key ? " selected" : ""}>${meta.label}</option>`;
  }).join("");
  return `<select class="status-select" data-detail-status>${options}</select>`;
}

function buildQuotationsSection(project) {
  const quotations = getQuotationsByProjectId(project.id);

  if (!quotations.length) {
    return `
      <h3 class="detail-section-title">Quotations</h3>
      <p class="field-help detail-empty-note">${t("detail.noQuotationYet")}</p>
      <button class="btn btn-secondary" data-detail-create-quotation>${t("detail.createQuotation")}</button>
    `;
  }

  const list = quotations.map((q) => {
    const status = getQuotationStatusMeta(q.status);
    return `
    <div class="detail-doc-item">
      <div>
        <p class="detail-doc-number">${q.quotationNumber}</p>
        <p class="detail-doc-created">${formatIDR(q.total)} \u00b7 <span class="badge ${status.badgeClass}">${status.label}</span></p>
      </div>
      <div class="detail-doc-actions">
        <button class="btn-link" data-detail-open-quotation="${q.id}">Open</button>
        <button class="btn-link" data-detail-download-quotation="${q.id}">Download</button>
      </div>
    </div>
  `;
  }).join("");

  return `
    <h3 class="detail-section-title">Quotations</h3>
    <div class="detail-doc-list">${list}</div>
    <button class="btn btn-secondary detail-doc-new" data-detail-create-quotation>${t("detail.newQuotation")}</button>
  `;
}

function buildProposalsSection(project) {
  const proposals = getProposalsByProjectId(project.id);

  if (!proposals.length) {
    return `
      <h3 class="detail-section-title">Proposals</h3>
      <p class="field-help detail-empty-note">${t("detail.noProposalsYet")}</p>
      <button class="btn btn-secondary" data-detail-create-proposal>${t("detail.createProposal")}</button>
    `;
  }

  const list = proposals.map((p) => {
    const status = getProposalStatusMeta(p.status);
    return `
    <div class="detail-doc-item">
      <div>
        <p class="detail-doc-number">${p.proposalNumber}</p>
        <p class="detail-doc-created">${formatIDR(p.investment)} \u00b7 <span class="badge ${status.badgeClass}">${status.label}</span></p>
      </div>
      <div class="detail-doc-actions">
        <button class="btn-link" data-detail-open-proposal="${p.id}">Open</button>
        <button class="btn-link" data-detail-download-proposal="${p.id}">Download</button>
      </div>
    </div>
  `;
  }).join("");

  return `
    <h3 class="detail-section-title">Proposals</h3>
    <div class="detail-doc-list">${list}</div>
    <button class="btn btn-secondary detail-doc-new" data-detail-create-proposal>${t("detail.newProposal")}</button>
  `;
}

function buildInvoicesSection(project) {
  const invoices = getInvoicesByProjectId(project.id);

  if (!invoices.length) {
    return `
      <h3 class="detail-section-title">Invoices</h3>
      <p class="field-help detail-empty-note">${t("detail.noInvoicesYet")}</p>
      <button class="btn btn-secondary" data-detail-create-invoice>${t("detail.createInvoice")}</button>
    `;
  }

  const list = invoices.map((inv) => {
    const status = getInvoiceStatusMeta(inv.status);
    return `
    <div class="detail-doc-item">
      <div>
        <p class="detail-doc-number">${inv.invoiceNumber}</p>
        <p class="detail-doc-created">${formatIDR(inv.total)} \u00b7 <span class="badge ${status.badgeClass}">${status.label}</span></p>
      </div>
      <div class="detail-doc-actions">
        <button class="btn-link" data-detail-open-invoice="${inv.id}">Open</button>
        <button class="btn-link" data-detail-download-invoice="${inv.id}">Download</button>
      </div>
    </div>
  `;
  }).join("");

  return `
    <h3 class="detail-section-title">Invoices</h3>
    <div class="detail-doc-list">${list}</div>
    <button class="btn btn-secondary detail-doc-new" data-detail-create-invoice>${t("detail.newInvoice")}</button>
  `;
}

function renderProjectDetail(project) {
  const b = project.calculationBreakdown || {};

  detailBody.innerHTML = `
    <h2 class="detail-title">${escapeHtml(project.name)}</h2>

    <div class="detail-field">
      <label>Client</label>
      <input type="text" class="detail-client-input" value="${escapeHtml(project.client || "")}" placeholder="Nama client" data-detail-client>
    </div>

    <div class="detail-row">
      <div>
        <p class="detail-label">Price</p>
        <p class="detail-price">${formatIDR(project.price)}</p>
      </div>
      <div>
        <p class="detail-label">Status</p>
        ${buildStatusSelect(project)}
      </div>
    </div>

    <div class="detail-divider"></div>

    <h3 class="detail-section-title">Pricing Summary</h3>
    <div class="breakdown-row"><span>Working Hours</span><strong>${project.workingHours || 0} hours</strong></div>
    <div class="breakdown-row"><span>Labor Cost</span><strong>${formatIDR(b.laborCost || 0)}</strong></div>
    <div class="breakdown-row"><span>Additional Expenses</span><strong>${formatIDR(b.additionalExpenses || 0)}</strong></div>
    <div class="breakdown-row"><span>Risk Buffer</span><strong>${formatIDR(b.riskBufferAmount || 0)}</strong></div>
    <div class="breakdown-row breakdown-row-divider"><span>Total Cost</span><strong>${formatIDR(b.totalCost || 0)}</strong></div>
    <div class="breakdown-row"><span>Profit</span><strong>${formatIDR(b.profit || 0)}</strong></div>
    <div class="breakdown-row"><span>Profit Margin</span><strong>${project.profitMargin || 0}%</strong></div>

    <div class="detail-divider"></div>

    <h3 class="detail-section-title">Project Information</h3>
    <div class="breakdown-row"><span>Service</span><strong>${project.serviceType || "\u2014"}</strong></div>
    <div class="breakdown-row"><span>Created</span><strong>${formatSavedDate(project.createdAt)}</strong></div>
    <div class="breakdown-row"><span>Last Updated</span><strong>${formatSavedDate(project.updatedAt)}</strong></div>

    <div class="detail-divider"></div>

    ${buildQuotationsSection(project)}
    <div class="detail-divider"></div>
    ${buildProposalsSection(project)}
    <div class="detail-divider"></div>
    ${buildInvoicesSection(project)}

    <div class="detail-divider"></div>

    <div class="detail-actions">
      <button class="btn btn-secondary" data-detail-edit>Edit Pricing</button>
      <button class="btn btn-danger" data-detail-delete>Delete Project</button>
    </div>
  `;

  detailBody.querySelector('[data-detail-status]').addEventListener("change", (e) => {
    updateProjectStatus(project.id, e.target.value);
    refreshEverything();
    openProjectDetail(project.id); // re-render with fresh updatedAt/status
  });

  detailBody.querySelector('[data-detail-client]').addEventListener("change", (e) => {
    updateProject(project.id, { client: e.target.value.trim() });
    refreshEverything();
  });

  detailBody.querySelector('[data-detail-edit]').addEventListener("click", () => {
    const fresh = getProjectById(project.id);
    closeProjectDetail();
    if (window.FreelanceCalculator && fresh) window.FreelanceCalculator.loadProject(fresh);
    navigateTo("pricing-calculator");
    history.replaceState(null, "", "#pricing-calculator");
  });

  detailBody.querySelector('[data-detail-delete]').addEventListener("click", () => {
    openDeleteConfirm(project.id, { fromDetail: true });
  });

  const createQuoBtn = detailBody.querySelector('[data-detail-create-quotation]');
  if (createQuoBtn) {
    createQuoBtn.addEventListener("click", () => {
      closeProjectDetail();
      if (window.FreelanceQuotation) window.FreelanceQuotation.startNew(project.id);
      navigateTo("quotation-generator");
      history.replaceState(null, "", "#quotation-generator");
    });
  }

  detailBody.querySelectorAll('[data-detail-open-quotation]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const quotation = getQuotationById(btn.dataset.detailOpenQuotation);
      if (!quotation) return;
      closeProjectDetail();
      if (window.FreelanceQuotation) window.FreelanceQuotation.loadQuotation(quotation);
      navigateTo("quotation-generator");
      history.replaceState(null, "", "#quotation-generator");
    });
  });

  detailBody.querySelectorAll('[data-detail-download-quotation]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const quotation = getQuotationById(btn.dataset.detailDownloadQuotation);
      if (!quotation) return;
      closeProjectDetail();
      if (window.FreelanceQuotation) window.FreelanceQuotation.loadQuotation(quotation);
      navigateTo("quotation-generator");
      history.replaceState(null, "", "#quotation-generator");
      setTimeout(() => document.querySelector('[data-quo-pdf]').click(), 150);
    });
  });

  const createPropBtn = detailBody.querySelector('[data-detail-create-proposal]');
  if (createPropBtn) {
    createPropBtn.addEventListener("click", () => {
      closeProjectDetail();
      if (window.FreelanceProposal) window.FreelanceProposal.startNew(project.id);
      navigateTo("proposal-generator");
      history.replaceState(null, "", "#proposal-generator");
    });
  }

  detailBody.querySelectorAll('[data-detail-open-proposal]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const proposal = getProposalById(btn.dataset.detailOpenProposal);
      if (!proposal) return;
      closeProjectDetail();
      if (window.FreelanceProposal) window.FreelanceProposal.loadProposal(proposal);
      navigateTo("proposal-generator");
      history.replaceState(null, "", "#proposal-generator");
    });
  });

  detailBody.querySelectorAll('[data-detail-download-proposal]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const proposal = getProposalById(btn.dataset.detailDownloadProposal);
      if (!proposal) return;
      closeProjectDetail();
      if (window.FreelanceProposal) window.FreelanceProposal.loadProposal(proposal);
      navigateTo("proposal-generator");
      history.replaceState(null, "", "#proposal-generator");
      setTimeout(() => document.querySelector('[data-prop-pdf]').click(), 150);
    });
  });

  const createInvBtn = detailBody.querySelector('[data-detail-create-invoice]');
  if (createInvBtn) {
    createInvBtn.addEventListener("click", () => {
      closeProjectDetail();
      if (window.FreelanceInvoice) window.FreelanceInvoice.startNew(project.id);
      navigateTo("invoice-generator");
      history.replaceState(null, "", "#invoice-generator");
    });
  }

  detailBody.querySelectorAll('[data-detail-open-invoice]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const invoice = getInvoiceById(btn.dataset.detailOpenInvoice);
      if (!invoice) return;
      closeProjectDetail();
      if (window.FreelanceInvoice) window.FreelanceInvoice.loadInvoice(invoice);
      navigateTo("invoice-generator");
      history.replaceState(null, "", "#invoice-generator");
    });
  });

  detailBody.querySelectorAll('[data-detail-download-invoice]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const invoice = getInvoiceById(btn.dataset.detailDownloadInvoice);
      if (!invoice) return;
      closeProjectDetail();
      if (window.FreelanceInvoice) window.FreelanceInvoice.loadInvoice(invoice);
      navigateTo("invoice-generator");
      history.replaceState(null, "", "#invoice-generator");
      setTimeout(() => document.querySelector('[data-inv-pdf]').click(), 150);
    });
  });
}

function openProjectDetail(id) {
  const project = getProjectById(id);
  if (!project) return;
  renderProjectDetail(project);
  detailOverlay.hidden = false;
}

function closeProjectDetail() {
  detailOverlay.hidden = true;
}

if (detailOverlay) {
  detailOverlay.addEventListener("click", (e) => {
    if (e.target === detailOverlay) closeProjectDetail();
  });
  document.querySelector('[data-detail-close]').addEventListener("click", closeProjectDetail);
}

/* ---------------------------------------------------------------------
   DELETE CONFIRMATION MODAL — shared by projects and quotations.
   --------------------------------------------------------------------- */

const deleteOverlay = document.querySelector('[data-delete-overlay]');
const deleteTitleEl = document.querySelector('[data-delete-title]');
const deleteTextEl = document.querySelector('[data-delete-text]');
const deleteConfirmBtn = document.querySelector('[data-delete-confirm]');

let pendingDeleteType = "project"; // "project" | "quotation"

const DELETE_COPY = {
  project: { titleKey: "delete.project.title", textKey: "delete.project.text", buttonKey: "delete.project.button" },
  quotation: { titleKey: "delete.quotation.title", textKey: "delete.quotation.text", buttonKey: "delete.quotation.button" },
  proposal: { titleKey: "delete.proposal.title", textKey: "delete.proposal.text", buttonKey: "delete.proposal.button" },
  invoice: { titleKey: "delete.invoice.title", textKey: "delete.invoice.text", buttonKey: "delete.invoice.button" },
  "business-profile": { titleKey: "delete.businessProfile.title", textKey: "delete.businessProfile.text", buttonKey: "delete.businessProfile.button" },
  "rate-card": { titleKey: "delete.rateCard.title", textKey: "delete.rateCard.text", buttonKey: "delete.rateCard.button" },
  template: { titleKey: "delete.template.title", textKey: "delete.template.text", buttonKey: "delete.template.button" },
};

function openDeleteConfirm(id, opts) {
  pendingDeleteId = id;
  pendingDeleteFromDetail = !!(opts && opts.fromDetail);
  pendingDeleteType = (opts && opts.type) || "project";

  const copy = DELETE_COPY[pendingDeleteType];
  deleteTitleEl.textContent = t(copy.titleKey);
  deleteTextEl.textContent = t(copy.textKey);
  deleteConfirmBtn.textContent = t(copy.buttonKey);

  deleteOverlay.hidden = false;
}

function closeDeleteConfirm() {
  pendingDeleteId = null;
  deleteOverlay.hidden = true;
}

if (deleteOverlay) {
  deleteOverlay.addEventListener("click", (e) => {
    if (e.target === deleteOverlay) closeDeleteConfirm();
  });
  document.querySelector('[data-delete-cancel]').addEventListener("click", closeDeleteConfirm);
  deleteConfirmBtn.addEventListener("click", () => {
    if (!pendingDeleteId) return;

    let ok = true;
    if (pendingDeleteType === "quotation") {
      ok = deleteQuotation(pendingDeleteId);
    } else if (pendingDeleteType === "proposal") {
      ok = deleteProposal(pendingDeleteId);
    } else if (pendingDeleteType === "invoice") {
      ok = deleteInvoice(pendingDeleteId);
    } else if (pendingDeleteType === "business-profile") {
      ok = resetBusinessProfile();
      if (ok && window.FreelanceSettings) window.FreelanceSettings.afterReset();
    } else if (pendingDeleteType === "rate-card") {
      ok = deleteRateCard(pendingDeleteId);
    } else if (pendingDeleteType === "template") {
      ok = deleteTemplate(pendingDeleteId);
      if (ok && window.FreelanceTemplates) {
        window.FreelanceTemplates.renderTemplatesList();
        window.FreelanceTemplates.refreshTemplateDropdowns();
      }
    } else {
      ok = deleteProject(pendingDeleteId);
    }

    const wasFromDetail = pendingDeleteFromDetail;
    const deletedType = pendingDeleteType;
    closeDeleteConfirm();
    if (wasFromDetail) closeProjectDetail();
    refreshEverything();

    if (!ok) {
      // Already gone (double delete / stale reference) or the write
      // failed — either way, don't claim a deletion that didn't happen.
      if (typeof showToast === "function") showToast(t("delete.nothingDeleted"));
      return;
    }

    const DELETE_TOAST = {
      project: "delete.success.project",
      quotation: "delete.success.quotation",
      proposal: "delete.success.proposal",
      invoice: "delete.success.invoice",
      "rate-card": "delete.success.rateCard",
      "template": "delete.success.template",
    };
    if (DELETE_TOAST[deletedType] && typeof showToast === "function") {
      showToast(t(DELETE_TOAST[deletedType]));
    }
  });
}

/* ---------------------------------------------------------------------
   Refresh every view that can show project data.
   --------------------------------------------------------------------- */

function refreshEverything() {
  if (typeof renderDashboard === "function") {
    renderDashboard();
  } else {
    if (typeof renderProjectsPanel === "function") renderProjectsPanel();
    if (typeof renderSummaryCards === "function") renderSummaryCards();
  }
  renderMyProjectsPage();
  if (window.FreelanceQuotation) window.FreelanceQuotation.renderMyQuotationsPage();
  if (window.FreelanceProposal) window.FreelanceProposal.renderMyProposalsPage();
  if (window.FreelanceInvoice) window.FreelanceInvoice.renderMyInvoicesPage();
  if (window.FreelanceRateCard) window.FreelanceRateCard.renderMyRateCardsPage();
  if (window.FreelanceTemplates) {
    window.FreelanceTemplates.renderTemplatesList();
    window.FreelanceTemplates.refreshTemplateDropdowns();
  }
  if (window.FreelanceSettings) {
    // Only refresh the small profile-completion card here — NOT
    // loadIntoForm(), which would overwrite whatever the person is
    // currently typing on the Settings page if a delete happens
    // elsewhere while it's open. loadIntoForm() is called explicitly
    // by backup.js after a restore/clear, where overwriting the form
    // is exactly the intended behavior.
    window.FreelanceSettings.renderProfileCard();
  }
}

window.FreelanceProjects = { renderMyProjectsPage, openProjectDetail, openDeleteConfirm };

