/* ==========================================================================
   APP.JS
   Foundation-level interactivity only: navigation/routing between built
   pages and placeholders, sidebar rail/panel, profile dropdown, theme
   toggle, and rendering the Recent Projects panel (table + mobile
   cards + empty state) from the data layer. Pricing Calculator is the
   first fully functional page (session 2); everything else still
   falls back to the shared placeholder until it's built.
   ========================================================================== */

// Every generator/list file in this app escapes user-entered text
// before interpolating it into innerHTML; this file previously didn't
// for the Dashboard's Recent Projects and the Revision Calculator's
// project dropdown, which meant a project name/client containing HTML
// could break rendering or, with something like "<script>", execute.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Human-readable titles + breadcrumb group for every route, resolved
// through t() so the topbar title updates with the active language.
// Any page without a matching [data-page-panel] element renders the
// shared placeholder until it's built in a future session.
const PAGE_META = {
  "dashboard":            { titleKey: "nav.dashboard",            group: "Overview" },
  "pricing-calculator":   { titleKey: "nav.pricingCalculator",    group: "Pricing" },
  "revision-calculator":  { titleKey: "nav.revisionCalculator",   group: "Pricing" },
  "quotation-generator":  { titleKey: "nav.quotationGenerator",   group: "Documents" },
  "proposal-generator":   { titleKey: "nav.proposalGenerator",    group: "Documents" },
  "invoice-generator":    { titleKey: "nav.invoiceGenerator",     group: "Documents" },
  "rate-card-generator":  { titleKey: "nav.rateCardGenerator",    group: "Documents" },
  "templates":            { titleKey: "nav.templates",            group: "Library" },
  "my-projects":          { titleKey: "nav.myProjects",           group: "Overview" },
  "my-quotations":        { titleKey: "nav.myQuotations",         group: "Documents" },
  "my-proposals":         { titleKey: "nav.myProposals",          group: "Documents" },
  "my-invoices":          { titleKey: "nav.myInvoices",           group: "Documents" },
  "my-rate-cards":        { titleKey: "nav.myRateCards",          group: "Documents" },
  "settings":             { titleKey: "nav.settings",             group: "Account" },
  "help":                 { titleKey: "nav.help",                 group: "Account" },
};

// Which contextual "create" action the topbar CTA button should show
// per page — one shared button, swapped instead of duplicated per page.
// Pages not listed here hide the CTA entirely (nothing to "create" yet).
const TOPBAR_CTA = {
  "dashboard":           { labelKey: "topbar.newProject",   page: "pricing-calculator" },
  "my-projects":         { labelKey: "topbar.newProject",   page: "pricing-calculator" },
  "my-quotations":       { labelKey: "topbar.newQuotation", page: "quotation-generator" },
  "my-proposals":        { labelKey: "topbar.newProposal",  page: "proposal-generator" },
  "my-invoices":         { labelKey: "topbar.newInvoice",   page: "invoice-generator" },
  "my-rate-cards":       { labelKey: "topbar.newRateCard",  page: "rate-card-generator" },
  "templates":           { labelKey: "topbar.newTemplate",  page: "templates" },
};

const topbarCtaBtn = document.querySelector('[data-topbar-cta]');
const topbarCtaLabel = document.querySelector('[data-topbar-cta-label]');

function updateTopbarCta(page) {
  const config = TOPBAR_CTA[page];
  if (!config || !isPageAllowed(config.page)) {
    topbarCtaBtn.hidden = true;
    return;
  }
  topbarCtaBtn.hidden = false;
  topbarCtaBtn.dataset.page = config.page;
  topbarCtaLabel.textContent = t(config.labelKey);
}

// The topbar CTA on the Templates page points at "templates" itself
// (there's no separate generator route to send it to), so it needs
// its own listener to actually open the create form — the generic
// [data-page] handler below only navigates, it doesn't know to open
// anything. Scoped to this one button only, so the sidebar's regular
// "Templates" nav link is unaffected and still opens straight to the
// list.
topbarCtaBtn.addEventListener("click", () => {
  if (topbarCtaBtn.dataset.page === "templates" && window.FreelanceTemplates) {
    window.FreelanceTemplates.openNewTemplateForm();
  }
});

const pagePanels = document.querySelectorAll('[data-page-panel]');
const placeholderPanel = document.querySelector('[data-page-panel="placeholder"]');
const placeholderTitle = document.querySelector('[data-placeholder-title]');
const placeholderText = document.querySelector('[data-placeholder-text]');
const pageTitleEl = document.querySelector('[data-page-title]');
const navLinks = document.querySelectorAll('.nav-link[data-page]');
const actionLinks = document.querySelectorAll('[data-page]');
applyPackageAccess();

/* ---------------------------------------------------------------------
   ROUTING
   Small hash router: shows the panel matching [data-page-panel="<page>"]
   if one exists (a real, built page), otherwise shows the shared
   placeholder with the right copy.
   --------------------------------------------------------------------- */

function isPageAllowed(page) {
  const allowed = window.FreelanceKitPackage && window.FreelanceKitPackage.allowedPages;
  return !Array.isArray(allowed) || allowed.length === 0 || allowed.includes(page);
}

function applyPackageAccess() {
  const allowed = window.FreelanceKitPackage && window.FreelanceKitPackage.allowedPages;
  if (!Array.isArray(allowed) || allowed.length === 0) return;
  document.querySelectorAll('[data-page]').forEach((el) => {
    if (!allowed.includes(el.dataset.page)) {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
    }
  });
  if (topbarCtaBtn && topbarCtaBtn.dataset.page && !allowed.includes(topbarCtaBtn.dataset.page)) {
    topbarCtaBtn.hidden = true;
  }
}

function navigateTo(page) {
  if (!isPageAllowed(page)) page = "dashboard";
  if (!PAGE_META[page]) page = "dashboard";
  const meta = PAGE_META[page];
  const title = t(meta.titleKey);

  pageTitleEl.textContent = title;
  updateTopbarCta(page);

  const targetPanel = document.querySelector(`[data-page-panel="${page}"]`);
  pagePanels.forEach((panel) => { panel.hidden = true; });

  if (targetPanel) {
    targetPanel.hidden = false;
  } else {
    placeholderPanel.hidden = false;
    placeholderTitle.textContent = title;
    placeholderText.textContent = t("placeholder.buildingPage", { title });
  }

  // Recent Projects / summary cards can change (a project may have
  // just been saved, edited, or deleted) — refresh whenever the
  // Dashboard becomes visible again. My Projects refreshes the same way.
  if (page === "dashboard") {
    renderDashboard();
  }
  if (page === "my-projects" && window.FreelanceProjects) {
    window.FreelanceProjects.renderMyProjectsPage();
  }
  if (page === "my-quotations" && window.FreelanceQuotation) {
    window.FreelanceQuotation.renderMyQuotationsPage();
  }
  if (page === "my-proposals" && window.FreelanceProposal) {
    window.FreelanceProposal.renderMyProposalsPage();
  }
  if (page === "my-invoices" && window.FreelanceInvoice) {
    window.FreelanceInvoice.renderMyInvoicesPage();
  }
  if (page === "my-rate-cards" && window.FreelanceRateCard) {
    window.FreelanceRateCard.renderMyRateCardsPage();
  }
  if (page === "templates" && window.FreelanceTemplates) {
    // Just refresh the list — don't reset/close the create-edit form
    // here. Opening it is a deliberate action (the "+ New Template"
    // CTA or an Edit click), not something a plain page visit should
    // undo or trigger.
    window.FreelanceTemplates.renderTemplatesList();
  }
  if (page === "settings" && window.FreelanceSettings) {
    window.FreelanceSettings.loadIntoForm();
  }
  if (page === "revision-calculator" && window.RevisionCalculator) {
    window.RevisionCalculator.refresh();
  }
  if (page === "help" && window.FreelanceHelp) {
    window.FreelanceHelp.goHome();
  }

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.page === page);
  });

  const packageName = window.FreelanceKitPackage?.name;
  document.title = packageName && packageName !== 'Full Freelance Kit'
    ? `${title} · ${packageName}`
    : `${title} · Freelance Kit`;
  if (window.innerWidth <= 860) closePanel();
  closeProfileMenu();
}

actionLinks.forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const page = el.dataset.page;
    if (page === "pricing-calculator" && window.FreelanceCalculator) {
      window.FreelanceCalculator.resetToDefaults();
    }
    if (page === "quotation-generator" && window.FreelanceQuotation) {
      window.FreelanceQuotation.startNew(null);
    }
    if (page === "proposal-generator" && window.FreelanceProposal) {
      window.FreelanceProposal.startNew(null);
    }
    if (page === "invoice-generator" && window.FreelanceInvoice) {
      window.FreelanceInvoice.startNew(null);
    }
    if (page === "rate-card-generator" && window.FreelanceRateCard) {
      window.FreelanceRateCard.startNew();
    }
    navigateTo(page);
    history.replaceState(null, "", `#${page}`);
  });
});

function routeFromHash() {
  const page = window.location.hash.replace("#", "") || "dashboard";
  navigateTo(page);
}
window.addEventListener("hashchange", routeFromHash);

/* ---------------------------------------------------------------------
   SIDEBAR PANEL — one toggle (in the rail) controls open/closed at
   every screen size. The overlay behind the panel on narrow screens
   just gives a tap-away-to-close area.
   --------------------------------------------------------------------- */

const overlay = document.querySelector('[data-overlay]');

function closePanel() {
  applyCollapse(true);
}

overlay.addEventListener("click", closePanel);

/* ---------------------------------------------------------------------
   SIDEBAR COLLAPSE (rail-only vs rail+panel)
   Preference remembered the same lightweight way as theme — a UI
   setting, not application data.
   --------------------------------------------------------------------- */

const COLLAPSE_KEY = "freelance-kit-sidebar-collapsed";
const collapseToggleBtn = document.querySelector('[data-collapse-toggle]');

function applyCollapse(collapsed) {
  document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
  overlay.classList.toggle("is-open", !collapsed && window.innerWidth <= 860);
  try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch (err) { /* ignore */ }
}

(function initCollapse() {
  let saved = null;
  try { saved = localStorage.getItem(COLLAPSE_KEY); } catch (err) { /* ignore */ }
  // On narrow screens default to closed (rail only) regardless of any
  // saved desktop preference, so the panel doesn't cover the screen
  // on first load.
  const defaultCollapsed = window.innerWidth <= 860 ? true : saved === "1";
  applyCollapse(saved !== null ? saved === "1" : defaultCollapsed);
})();

collapseToggleBtn.addEventListener("click", () => {
  applyCollapse(!document.documentElement.classList.contains("sidebar-collapsed"));
});

/* ---------------------------------------------------------------------
   PROFILE DROPDOWN
   --------------------------------------------------------------------- */

const profile = document.querySelector('[data-profile]');
const profileTrigger = document.querySelector('[data-profile-trigger]');

function closeProfileMenu() {
  profile.classList.remove("is-open");
}

profileTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  profile.classList.toggle("is-open");
});
document.addEventListener("click", (e) => {
  if (!profile.contains(e.target)) closeProfileMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeProfileMenu();
    closePanel();
  }
});

/* ---------------------------------------------------------------------
   THEME TOGGLE
   Light/dark only; preference is remembered for this browser via
   localStorage (UI preference only — not application/project data, so
   this doesn't conflict with the "no storage in V1" rule for real data).
   --------------------------------------------------------------------- */

const THEME_KEY = "freelance-kit-theme";
const themeToggleBtns = document.querySelectorAll('[data-theme-toggle]');
const themeSetBtns = document.querySelectorAll('[data-theme-set]');

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (err) { /* ignore */ }
  // Keeps the expanded sidebar's Light/Dark segmented control in sync
  // regardless of which control changed the theme (the segmented
  // control itself, or the compact rail toggle used when collapsed).
  themeSetBtns.forEach((btn) => {
    const isActive = btn.dataset.themeSet === theme;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (err) { /* ignore */ }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
})();

themeToggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
});

themeSetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.themeSet);
  });
});

/* ---------------------------------------------------------------------
   RECENT PROJECTS — render table (desktop/tablet) + card list (mobile)
   + empty state, all from the same data source.
   --------------------------------------------------------------------- */

function renderProjectsPanel() {
  const panel = document.querySelector('[data-projects-panel]');
  const items = getProjects();

  if (!items.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5h16M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5M4 8.5l2-4h12l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="empty-title">No projects yet</h3>
        <p class="empty-text">Create your first project and start calculating your price.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" data-page="pricing-calculator">Create Your First Project</button>
          <button class="btn btn-text" data-load-sample>Load Sample Data</button>
        </div>
      </div>`;
    panel.querySelector('[data-page]').addEventListener("click", (e) => {
      e.preventDefault();
      if (window.FreelanceCalculator) window.FreelanceCalculator.resetToDefaults();
      navigateTo("pricing-calculator");
      history.replaceState(null, "", "#pricing-calculator");
    });
    panel.querySelector('[data-load-sample]').addEventListener("click", () => {
      loadSampleData();
      renderProjectsPanel();
      renderSummaryCards();
    });
    return;
  }

  const rows = items.map((p) => {
    const status = getStatusMeta(p.status);
    return `
      <tr${p.id ? ` data-project-id="${p.id}" class="row-clickable"` : ""}>
        <td class="cell-project">${escapeHtml(p.name)}</td>
        <td class="cell-client">${escapeHtml(p.client)}</td>
        <td class="cell-price num">${formatIDR(p.price)}${p.priceUnit}</td>
        <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
        <td class="cell-updated">${p.updated}</td>
      </tr>`;
  }).join("");

  const cards = items.map((p) => {
    const status = getStatusMeta(p.status);
    return `
      <div class="project-card-item${p.id ? " row-clickable" : ""}"${p.id ? ` data-project-id="${p.id}"` : ""}>
        <div class="project-card-top">
          <div>
            <p class="project-card-name">${escapeHtml(p.name)}</p>
            <p class="project-card-client">${escapeHtml(p.client)}</p>
          </div>
          <span class="badge ${status.badgeClass}">${status.label}</span>
        </div>
        <div class="project-card-bottom">
          <span class="project-card-price">${formatIDR(p.price)}${p.priceUnit}</span>
          <span class="project-card-updated">${p.updated}</span>
        </div>
      </div>`;
  }).join("");

  panel.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>${t("table.project")}</th>
          <th>${t("table.client")}</th>
          <th class="num">${t("table.price")}</th>
          <th>${t("table.status")}</th>
          <th>${t("table.updated")}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="project-cards">${cards}</div>
  `;

  panel.querySelectorAll('[data-project-id]').forEach((el) => {
    el.addEventListener("click", () => {
      if (window.FreelanceProjects) window.FreelanceProjects.openProjectDetail(el.dataset.projectId);
    });
  });
}

/* ---------------------------------------------------------------------
   SUMMARY CARDS — reads real project data once the user has saved at
   least one; falls back to the empty-state demo numbers otherwise.
   --------------------------------------------------------------------- */

function renderSummaryCards() {
  const s = getSummary();

  document.querySelector('[data-summary="totalProjects"]').textContent = s.totalProjects.value;
  document.querySelector('[data-summary-caption-text="totalProjects"]').textContent = s.totalProjects.deltaLabel;

  document.querySelector('[data-summary="totalRevenue"]').textContent = formatIDR(s.totalRevenue.value);
  document.querySelector('[data-summary-caption-text="totalRevenue"]').textContent = s.totalRevenue.deltaLabel;

  document.querySelector('[data-summary="pendingProposals"]').textContent = s.pendingProposals.value;
  document.querySelector('[data-summary-caption-text="pendingProposals"]').textContent = s.pendingProposals.caption;

  document.querySelector('[data-summary="approvedCount"]').textContent = s.approvedCount.value;
  document.querySelector('[data-summary-caption-text="approvedCount"]').textContent = s.approvedCount.caption;
}

/* ---------------------------------------------------------------------
   DASHBOARD GREETING — uses the saved Business Profile's owner/business
   name when one exists; falls back to a neutral, non-fake greeting.
   Never invents or hardcodes a person's name.
   --------------------------------------------------------------------- */

function renderDashboardGreeting() {
  const el = document.querySelector('[data-dashboard-greeting]');
  if (!el) return;
  const profile = (typeof getBusinessProfile === "function") ? getBusinessProfile() : null;
  const name = profile && (profile.ownerName || profile.businessName)
    ? (profile.ownerName || profile.businessName)
    : t("dashboard.greeting.defaultName");
  el.textContent = t("dashboard.greeting", { name });
}

/* ---------------------------------------------------------------------
   NEEDS ATTENTION — compact summary of existing quotations/proposals/
   invoices that need a follow-up. Reads only existing saved records
   and their existing status fields; never invents data. Each row is
   clickable and navigates to the existing list page for that document
   type (reusing existing navigation only).
   --------------------------------------------------------------------- */

function renderNeedsAttention() {
  const el = document.querySelector('[data-needs-attention]');
  if (!el) return;

  const pendingQuotations = (typeof getSavedQuotations === "function")
    ? getSavedQuotations().filter((q) => q.status === "sent").length : 0;
  const pendingProposals = (typeof getSavedProposals === "function")
    ? getSavedProposals().filter((p) => p.status === "sent").length : 0;
  const outstandingInvoices = (typeof getSavedInvoices === "function")
    ? getSavedInvoices().filter((i) => i.status === "sent" || i.status === "overdue").length : 0;

  const items = [];
  if (pendingQuotations > 0) {
    items.push({
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 2.3h6.4l2.6 2.6v8.8a.9.9 0 0 1-.9.9H3.5a.9.9 0 0 1-.9-.9V3.2a.9.9 0 0 1 .9-.9Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.4 8.2h5.2M5.4 10.4h3.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
      label: t(pendingQuotations === 1 ? "needsAttention.quotations.one" : "needsAttention.quotations.other", { n: pendingQuotations }),
      context: t("needsAttention.waitingForResponse"),
      page: "my-quotations",
    });
  }
  if (pendingProposals > 0) {
    items.push({
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.6 13.4 5.3 12.6l6.8-6.8a1.5 1.5 0 0 0-2.1-2.1L3.2 10.5l-.6 2.9Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
      label: t(pendingProposals === 1 ? "needsAttention.proposals.one" : "needsAttention.proposals.other", { n: pendingProposals }),
      context: t("needsAttention.pendingApproval"),
      page: "my-proposals",
    });
  }
  if (outstandingInvoices > 0) {
    items.push({
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2.8" y="2.3" width="10.4" height="11.4" rx="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M5.3 5.9h5.4M5.3 8.2h5.4M5.3 10.5h3.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
      label: t(outstandingInvoices === 1 ? "needsAttention.invoices.one" : "needsAttention.invoices.other", { n: outstandingInvoices }),
      context: t("needsAttention.paymentOutstanding"),
      page: "my-invoices",
    });
  }

  if (!items.length) {
    el.innerHTML = `
      <p class="side-card-title">${t("dashboard.needsAttention.title")}</p>
      <div class="needs-attention-item needs-attention-item-ok">
        <span class="needs-attention-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.3 8.4 6.4 11.5l6.3-7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="needs-attention-text">
          <span class="needs-attention-label">${t("dashboard.needsAttention.allCaughtUp")}</span>
        </span>
      </div>`;
    return;
  }

  el.innerHTML = `
    <p class="side-card-title">${t("dashboard.needsAttention.title")}</p>
    ${items.map((it) => `
      <button type="button" class="needs-attention-item is-actionable" data-goto-page="${it.page}">
        <span class="needs-attention-icon">${it.icon}</span>
        <span class="needs-attention-text">
          <span class="needs-attention-label">${it.label}</span>
          <span class="needs-attention-context">${it.context}</span>
        </span>
        <span class="needs-attention-arrow">›</span>
      </button>`).join("")}
  `;

  el.querySelectorAll('[data-goto-page]').forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.gotoPage);
      history.replaceState(null, "", `#${btn.dataset.gotoPage}`);
    });
  });
}

/* ---------------------------------------------------------------------
   DASHBOARD BACKUP CARD (top row) — a permanent, always-visible utility
   card, distinct from the conditional Backup Reminder banner below the
   summary cards. Both read the exact same source of truth and the
   exact same freshness rule (getLastBackupAt + getLastDataChangedAt +
   BACKUP_REMINDER_OUTDATED_DAYS, all from data.js / backup-reminder.js)
   so they can never disagree — this one just doesn't hide itself when
   backup is current, since "Backup Data" is a stable fixture of the
   top row, not a nudge.
   --------------------------------------------------------------------- */

function triggerDashboardBackupNow() {
  if (window.FreelanceBackup && typeof window.FreelanceBackup.downloadBackup === "function") {
    window.FreelanceBackup.downloadBackup();
  } else if (typeof navigateTo === "function") {
    navigateTo("settings");
    history.replaceState(null, "", "#settings");
  }
}

function renderDashboardBackupCard() {
  const el = document.querySelector('[data-dashboard-backup-card]');
  if (!el) return;

  const lastBackupAt = typeof getLastBackupAt === "function" ? getLastBackupAt() : null;
  const outdatedDays = typeof BACKUP_REMINDER_OUTDATED_DAYS === "number" ? BACKUP_REMINDER_OUTDATED_DAYS : 14;

  let statusLabel, statusValue, subText = "", isWarning = false;

  if (!lastBackupAt) {
    statusValue = t("dashboard.backupData.recommended");
    subText = t("dashboard.backupData.neverBackedUp");
    isWarning = true;
  } else {
    const last = new Date(lastBackupAt);
    const now = new Date();
    const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    // Same "is this backup actually current" test the Backup Reminder
    // uses — data changed after the backup was made takes priority
    // over a simple day-count, since a backup made minutes ago is
    // still stale the moment something new was saved afterward.
    const lastChangeAt = typeof getLastDataChangedAt === "function" ? getLastDataChangedAt() : null;
    const changedSinceBackup = !!lastChangeAt && new Date(lastChangeAt).getTime() > last.getTime();

    if (changedSinceBackup) {
      statusValue = t("dashboard.backupData.recommended");
      subText = t("dashboard.backupData.changedSinceBackup");
      isWarning = true;
    } else if (daysSince >= outdatedDays) {
      statusValue = t("dashboard.backupData.recommended");
      subText = t("dashboard.backupData.oldBackup", { days: Math.floor(daysSince) });
      isWarning = true;
    } else if (now.toDateString() === last.toDateString()) {
      statusLabel = t("dashboard.backupData.lastBackup");
      const timeStr = last.toLocaleTimeString(getAppLanguage() === "id" ? "id-ID" : "en-US", { hour: "numeric", minute: "2-digit" });
      statusValue = t("dashboard.backupData.today", { time: timeStr });
      subText = t("dashboard.backupData.upToDate");
    } else {
      const days = Math.max(1, Math.round(daysSince));
      statusLabel = t("dashboard.backupData.lastBackup");
      statusValue = days === 1 ? t("dashboard.backupData.yesterday") : t("dashboard.backupData.daysAgo", { days });
      subText = t("dashboard.backupData.upToDate");
    }
  }

  el.innerHTML = `
    <p class="side-card-title">${t("dashboard.backupData.title")}</p>
    ${statusLabel ? `<p class="dashboard-backup-card-sub">${statusLabel}</p>` : ""}
    <p class="dashboard-backup-card-status${isWarning ? " is-warning" : ""}">${statusValue}</p>
    ${subText ? `<p class="dashboard-backup-card-sub">${subText}</p>` : ""}
    <button type="button" class="btn btn-secondary btn-sm dashboard-backup-card-btn" data-dashboard-backup-now>${t("action.backupNow")}</button>
  `;

  el.querySelector('[data-dashboard-backup-now]').addEventListener("click", triggerDashboardBackupNow);
}

window.FreelanceDashboardBackupCard = { refresh: renderDashboardBackupCard };

/* ---------------------------------------------------------------------
   UPCOMING DEADLINES — reads existing validUntil (quotations/proposals)
   and dueDate (invoices) fields on records that are still open (not yet
   accepted/rejected/paid). Never invents dates; shows the soonest few.
   --------------------------------------------------------------------- */

function formatDeadlineLabel(dateStr) {
  const due = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return { text: t(n === 1 ? "deadline.overdueBy.one" : "deadline.overdueBy.other", { n }), tone: "overdue" };
  }
  if (diffDays === 0) return { text: t("deadline.dueToday"), tone: "soon" };
  if (diffDays === 1) return { text: t("deadline.dueTomorrow"), tone: "soon" };
  if (diffDays <= 3) return { text: t("deadline.dueInDays", { n: diffDays }), tone: "soon" };
  return { text: t("deadline.dueInDays", { n: diffDays }), tone: "normal" };
}

function renderUpcomingDeadlines() {
  const el = document.querySelector('[data-dashboard-upcoming]');
  if (!el) return;

  const entries = [];
  if (typeof getSavedQuotations === "function") {
    getSavedQuotations().filter((q) => q.status === "sent" && q.validUntil).forEach((q) => {
      entries.push({ number: q.quotationNumber, type: "Quotation", date: q.validUntil, page: "my-quotations" });
    });
  }
  if (typeof getSavedProposals === "function") {
    getSavedProposals().filter((p) => p.status === "sent" && p.validUntil).forEach((p) => {
      entries.push({ number: p.proposalNumber, type: "Proposal", date: p.validUntil, page: "my-proposals" });
    });
  }
  if (typeof getSavedInvoices === "function") {
    getSavedInvoices().filter((i) => (i.status === "sent" || i.status === "overdue") && i.dueDate).forEach((i) => {
      entries.push({ number: i.invoiceNumber, type: "Invoice", date: i.dueDate, page: "my-invoices" });
    });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  const top = entries.slice(0, 4);

  if (!top.length) {
    el.innerHTML = `
      <p class="side-card-title">${t("dashboard.upcoming.title")}</p>
      <div class="side-card-empty">
        <span class="side-card-empty-dot"></span>
        <span>${t("dashboard.upcoming.empty")}</span>
      </div>`;
    return;
  }

  el.innerHTML = `
    <p class="side-card-title">${t("dashboard.upcoming.title")}</p>
    ${top.map((it) => {
      const { text, tone } = formatDeadlineLabel(it.date);
      const badgeClass = tone === "overdue" ? "deadline-badge-overdue" : tone === "soon" ? "deadline-badge-soon" : "";
      return `
        <button type="button" class="deadline-item" data-goto-page="${it.page}">
          <span class="deadline-text">
            <span class="deadline-number">${it.number || it.type}</span>
            <span class="deadline-context">${it.type}</span>
          </span>
          <span class="deadline-badge ${badgeClass}">${text}</span>
        </button>`;
    }).join("")}
  `;

  el.querySelectorAll('[data-goto-page]').forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.gotoPage);
      history.replaceState(null, "", `#${btn.dataset.gotoPage}`);
    });
  });
}

/* ---------------------------------------------------------------------
   RECENT ACTIVITY — intentionally not implemented. The app has no
   activity-tracking system (no log of "created quotation", "updated
   proposal", etc.), so a Recent Activity widget — even one that only
   ever shows an empty state — would imply a tracking feature that
   doesn't exist. Per the Phase 8C audit, this section was removed
   rather than kept as a permanently-empty placeholder.
   --------------------------------------------------------------------- */

/* ---------------------------------------------------------------------
   DASHBOARD ORCHESTRATOR — decides between the first-use welcome state
   (no saved projects yet) and the normal dashboard, then refreshes
   whichever pieces are visible. Sample data, once loaded, is a real
   saved project like any other, so it naturally shows the normal
   dashboard — never a special "sample" state.
   --------------------------------------------------------------------- */

function renderDashboard() {
  // Gated on any meaningful saved record (Projects, Quotations,
  // Proposals, Invoices, Rate Cards, or Templates) — not Projects
  // alone. A user who only has, say, Quotations still has real
  // activity and should see the normal dashboard, not the empty
  // welcome state.
  const hasData = hasAppData();
  const welcomeEl = document.querySelector('[data-dashboard-welcome]');
  const bodyEl = document.querySelector('[data-dashboard-body]');
  if (welcomeEl) welcomeEl.hidden = hasData;
  if (bodyEl) bodyEl.hidden = !hasData;

  renderDashboardGreeting();

  if (hasData) {
    renderProjectsPanel();
    renderSummaryCards();
    renderNeedsAttention();
    renderUpcomingDeadlines();
    renderDashboardBackupCard();
    if (window.FreelanceSettings) window.FreelanceSettings.renderProfileCard();
    if (window.FreelanceBackupReminder) window.FreelanceBackupReminder.refresh();
  }
}

const dashboardWelcomeLoadSampleBtn = document.querySelector('[data-welcome-load-sample]');
if (dashboardWelcomeLoadSampleBtn) {
  dashboardWelcomeLoadSampleBtn.addEventListener("click", () => {
    loadSampleData();
    renderDashboard();
  });
}

/* ---------------------------------------------------------------------
   GREETING (topbar) — pulled from data layer so it's easy to make
   dynamic later.
   --------------------------------------------------------------------- */

function renderUserGreeting() {
  const u = getUser();
  document.querySelector(".profile-name").textContent = t("profile.hiPrefix", { name: u.name });
  // .profile-role is translated via data-i18n + applyStaticTranslations()
  // (this ran after that, and used to stomp it back to the raw English
  // "Freelancer" string from data.js — harmless while both languages
  // happen to use the same word, but wrong in principle).
  // Avatars now show a generic profile icon (not user initials) — see
  // the .avatar spans in the markup. Initials are intentionally no
  // longer injected here so the icon isn't overwritten.

  document.querySelector('[data-mini-name]').textContent = u.name;
  document.querySelector('[data-mini-email]').textContent = u.email;
}

/* ---------------------------------------------------------------------
   ROW MENU DROPDOWNS — shared by every list page's row "•••" menu
   (My Projects, My Quotations, My Proposals, My Invoices, My Rate
   Cards, Templates). Each page wires its own trigger click handler,
   but they all call this to position the dropdown.

   The table these live in clips to rounded corners via
   `overflow: hidden` on its wrapper panel. A plain `position: absolute`
   dropdown is still a descendant of that clipped box, so it gets cut
   off exactly like any other overflowing content the moment a row is
   near the panel's bottom edge — that's the "cut off" dropdown bug.
   `position: fixed`, positioned here from the trigger's real
   on-screen coordinates, escapes that clipping (fixed-position
   elements aren't clipped by an ancestor's overflow unless that
   ancestor has its own transform/filter, which none of these do) and
   also lets it flip upward automatically when there isn't room below.
   --------------------------------------------------------------------- */

function positionRowMenuDropdown(trigger, dropdown) {
  const triggerRect = trigger.getBoundingClientRect();
  const dropdownHeight = dropdown.offsetHeight;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const openUpward = spaceBelow < dropdownHeight + 12 && triggerRect.top > dropdownHeight;

  dropdown.style.right = `${Math.max(8, viewportWidth - triggerRect.right)}px`;
  if (openUpward) {
    dropdown.style.top = "";
    dropdown.style.bottom = `${viewportHeight - triggerRect.top + 4}px`;
  } else {
    dropdown.style.bottom = "";
    dropdown.style.top = `${triggerRect.bottom + 4}px`;
  }
}

/* ---------------------------------------------------------------------
   TOPBAR DATE — today's day + date, in Indonesian.
   --------------------------------------------------------------------- */

function renderTopbarDate() {
  const today = new Date();
  const locale = getAppLanguage() === "id" ? "id-ID" : "en-US";
  const formatted = today.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  document.querySelectorAll('[data-topbar-date]').forEach((el) => {
    el.textContent = formatted;
  });
}

/* ---------------------------------------------------------------------
   REVISION CALCULATOR — small standalone tool, no save/PDF needed.
   --------------------------------------------------------------------- */

function initRevisionCalculator() {
  const panel = document.querySelector('[data-page-panel="revision-calculator"]');
  if (!panel) return;

  const feeInput = panel.querySelector('[data-revc="fee"]');
  const qtyInput = panel.querySelector('[data-revc="qty"]');
  const projectSelect = panel.querySelector('[data-revc-project]');
  const totalEl = panel.querySelector('[data-revc-total]');
  const breakdownEl = panel.querySelector('[data-revc-breakdown]');
  const feeRowEl = panel.querySelector('[data-revc-fee-row]');
  const qtyRowEl = panel.querySelector('[data-revc-qty-row]');
  const totalRowEl = panel.querySelector('[data-revc-total-row]');

  function parseDigits(value) {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }
  function formatGrouped(number) {
    return (number || number === 0) ? number.toLocaleString("id-ID") : "";
  }

  function populateProjects() {
    const saved = getSavedProjects();
    const options = [`<option value="">${t("revc.manualOption")}</option>`]
      .concat(saved.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`));
    projectSelect.innerHTML = options.join("");
  }

  function recalc() {
    const fee = parseDigits(feeInput.value);
    const qty = Math.max(0, Number(qtyInput.value) || 0);
    const total = fee * qty;
    totalEl.textContent = formatIDR(total);
    breakdownEl.textContent = t("revc.breakdown.revisionsTimesFee", { qty, fee: formatIDR(fee) });
    feeRowEl.textContent = formatIDR(fee);
    qtyRowEl.textContent = String(qty);
    totalRowEl.textContent = formatIDR(total);
  }

  feeInput.addEventListener("input", () => {
    feeInput.value = formatGrouped(parseDigits(feeInput.value));
    recalc();
  });
  qtyInput.addEventListener("input", recalc);

  projectSelect.addEventListener("change", () => {
    const project = getProjectById(projectSelect.value);
    if (project) {
      // Always take the project's saved fee, including a genuine 0 —
      // a truthy check here would silently keep whatever manual value
      // was typed before switching projects, since 0 is falsy but is
      // still a valid, explicitly-set revision fee.
      const projectFee = typeof project.additionalRevisionFee === "number" ? project.additionalRevisionFee : 0;
      feeInput.value = formatGrouped(projectFee);
    }
    recalc();
  });

  panel.querySelector('[data-revc-reset]').addEventListener("click", () => {
    projectSelect.value = "";
    feeInput.value = "";
    qtyInput.value = 1;
    recalc();
  });

  populateProjects();
  recalc();

  // Repopulate the project dropdown every time this page is opened,
  // in case new projects were saved since last visit.
  window.RevisionCalculator = { refresh: populateProjects };
}

initRevisionCalculator();

/* ---------------------------------------------------------------------
   HELP PAGE — content, search, and view rendering now live entirely in
   help.js (dynamic content needs event delegation, not a one-time
   querySelectorAll wire-up here).
   --------------------------------------------------------------------- */

/* ---------------------------------------------------------------------
   TOAST — small, reusable confirmation message. Used after real actions
   that already happened (e.g. deleting a project) — never decorative,
   never implying an action succeeded when it didn't.
   --------------------------------------------------------------------- */

// message-only: identical to before, unchanged for every existing call
// site. Pass a second "detail" line (e.g. from the backup flow) to get
// a slightly larger two-line toast instead of the usual single-line pill.
function showToast(message, detail) {
  const stack = document.querySelector('[data-toast-stack]');
  if (!stack) return;
  const toast = document.createElement("div");

  if (detail) {
    toast.className = "toast toast-detailed";
    const titleEl = document.createElement("span");
    titleEl.className = "toast-title";
    titleEl.textContent = message;
    const detailEl = document.createElement("span");
    detailEl.className = "toast-detail";
    detailEl.textContent = detail;
    toast.appendChild(titleEl);
    toast.appendChild(detailEl);
  } else {
    toast.className = "toast";
    toast.textContent = message;
  }

  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 200);
  }, detail ? 4200 : 2600);
}
window.showToast = showToast;

/* ---------------------------------------------------------------------
   INIT
   --------------------------------------------------------------------- */

applyStaticTranslations();
renderDashboard();
renderUserGreeting();
renderTopbarDate();
routeFromHash();
