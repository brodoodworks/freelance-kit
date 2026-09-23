/* ==========================================================================
   DATA LAYER
   Dummy data for V1 (used only as an empty-state placeholder). Real
   projects live in localStorage once the user starts saving from the
   Pricing Calculator — always go through the getters/setters below,
   never touch localStorage directly from other files.
   ========================================================================== */

const STATUS_META = {
  "draft":         { get label() { return t("status.draft"); },         badgeClass: "badge-draft" },
  "proposal-sent": { get label() { return t("status.proposalSent"); },  badgeClass: "badge-sent" },
  "approved":      { get label() { return t("status.approved"); },      badgeClass: "badge-approved" },
  "rejected":      { get label() { return t("status.rejected"); },      badgeClass: "badge-rejected" },
  "completed":     { get label() { return t("status.completed"); },     badgeClass: "badge-completed" },
};
const STATUS_ORDER = ["draft", "proposal-sent", "approved", "rejected", "completed"];

// Sample projects — NOT shown automatically. Only written into real
// storage (as real, editable projects) when the user explicitly clicks
// "Load Sample Data" on the empty Dashboard. See loadSampleData() below.
const SAMPLE_PROJECTS = [
  {
    name: "Website Company Profile",
    client: "PT Maju Bersama",
    price: 6285714,
    status: "proposal-sent",
    serviceType: "Website",
    hoursAgo: 2,
    workingHours: 35,
    hourlyRate: 100000,
    additionalExpenses: 300000,
    includedRevisions: 2,
    additionalRevisionFee: 200000,
    expectedAdditionalRevisions: 1,
    riskBuffer: 10,
    profitMargin: 30,
    calculationBreakdown: {
      laborCost: 3500000,
      additionalExpenses: 300000,
      revisionCost: 200000,
      baseCost: 4000000,
      riskBufferAmount: 400000,
      totalCost: 4400000,
      profit: 1885714,
      hourlyEarnings: 179592,
    },
  },
  {
    name: "Branding Package",
    client: "Kopi Nusantara",
    price: 3850000,
    status: "approved",
    serviceType: "Branding",
    hoursAgo: 24,
    workingHours: 20,
    hourlyRate: 125000,
    additionalExpenses: 150000,
    includedRevisions: 2,
    additionalRevisionFee: 150000,
    expectedAdditionalRevisions: 0,
    riskBuffer: 10,
    profitMargin: 24,
    calculationBreakdown: {
      laborCost: 2500000,
      additionalExpenses: 150000,
      revisionCost: 0,
      baseCost: 2650000,
      riskBufferAmount: 265000,
      totalCost: 2915000,
      profit: 935000,
      hourlyEarnings: 46750,
    },
  },
  {
    name: "Social Media Management",
    client: "Fashion Store ID",
    price: 2000000,
    status: "draft",
    serviceType: "Social Media",
    hoursAgo: 72,
    workingHours: 15,
    hourlyRate: 100000,
    additionalExpenses: 0,
    includedRevisions: 1,
    additionalRevisionFee: 100000,
    expectedAdditionalRevisions: 0,
    riskBuffer: 10,
    profitMargin: 18,
    calculationBreakdown: {
      laborCost: 1500000,
      additionalExpenses: 0,
      revisionCost: 0,
      baseCost: 1500000,
      riskBufferAmount: 150000,
      totalCost: 1650000,
      profit: 350000,
      hourlyEarnings: 23333,
    },
  },
];

// Seeds SAMPLE_PROJECTS as real, fully-editable saved projects (same
// record shape saveProject() produces, just backdated for realism).
// Only ever called from an explicit "Load Sample Data" click — never
// runs automatically, and never overwrites existing real projects.
function loadSampleData() {
  const now = Date.now();
  const list = readSavedProjectsRaw();
  SAMPLE_PROJECTS.forEach((sample) => {
    const { hoursAgo, ...project } = sample;
    const ts = new Date(now - hoursAgo * 3600 * 1000).toISOString();
    list.push({
      ...project,
      id: "proj_sample_" + Math.random().toString(36).slice(2, 9),
      createdAt: ts,
      updatedAt: ts,
    });
  });
  writeSavedProjectsRaw(list);
}

// Summary metrics — legacy empty-state demo numbers, kept only for
// reference. No longer used automatically; see getSummary() below,
// which now returns a real zero-state when there are no saved projects.
const summary = {
  totalProjects: { value: 12, deltaLabel: "+2 dari bulan lalu", direction: "up" },
  totalRevenue: { value: 67500000, deltaLabel: "+12.5% dari bulan lalu", direction: "up" },
  pendingProposals: { value: 5, caption: "Menunggu respons client" },
  approvedCount: { value: 8, caption: "Proyek disetujui" },
};

const user = {
  get name() { return t("user.defaultName"); },
  role: "Freelancer",
  get email() { return t("user.defaultEmail"); },
  initials: "YN",
};

/* ---- Formatting helpers ---- */

function formatIDR(amount) {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
}

function formatSavedDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch (err) {
    return "";
  }
}

/* ==========================================================================
   SAFE STORAGE HELPERS
   Every collection/object below is read and written through these four
   functions instead of touching localStorage ad hoc, so the same rules
   apply everywhere:
     - Reads never crash a caller: a missing key, corrupted JSON, or a
       value of the wrong shape (e.g. an object where an array was
       expected) all safely fall back to [] / null instead of returning
       something a caller's .slice()/.filter()/.find() would choke on.
     - Writes report real success/failure (localStorage.setItem can
       throw — quota exceeded, private-browsing restrictions, storage
       disabled) instead of silently swallowing the error and letting
       the caller believe the save worked when it didn't.
   ========================================================================== */

function safeReadArray(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[freelance-kit] "${key}" was not an array — using an empty list instead.`);
      return [];
    }
    return parsed;
  } catch (err) {
    console.warn(`[freelance-kit] "${key}" could not be read (corrupted data) — using an empty list instead.`, err);
    return [];
  }
}

function safeReadObject(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn(`[freelance-kit] "${key}" was not a valid saved object — ignoring it.`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn(`[freelance-kit] "${key}" could not be read (corrupted data) — ignoring it.`, err);
    return null;
  }
}

// Returns true on a real, persisted write; false if localStorage
// rejected it (quota exceeded, disabled, etc.) — callers that care
// about persistence actually succeeding (rather than just constructing
// an in-memory record) can check this instead of assuming success.
function safeWriteValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Optional hook for js/sync.js (cross-device sync, off by default).
    // Undefined when sync isn't enabled/loaded, so this is a no-op for
    // every install that doesn't turn sync on — see sync.js.
    if (typeof window.__freelanceSyncOnWrite === "function") window.__freelanceSyncOnWrite(key);
    return true;
  } catch (err) {
    console.warn(`[freelance-kit] Could not save "${key}" — the change was not persisted.`, err);
    return false;
  }
}

function safeRemoveValue(key) {
  try {
    localStorage.removeItem(key);
    if (typeof window.__freelanceSyncOnWrite === "function") window.__freelanceSyncOnWrite(key);
    return true;
  } catch (err) {
    console.warn(`[freelance-kit] Could not remove "${key}".`, err);
    return false;
  }
}

// Small random suffix appended to Date.now()-based ids, matching the
// pattern already used elsewhere in this app (sample data, template
// line items) — guards against two records of the same type being
// created within the same millisecond (e.g. a rapid double-click).
function idSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/* ---- Saved projects (localStorage) ----
   SAVE -> TRACK STATUS -> VIEW -> EDIT -> DELETE. A calculation alone
   never creates a project — only an explicit "Save to Project" click
   does, from the Pricing Calculator. */

const SAVED_PROJECTS_KEY = "freelance-kit-saved-projects";

function readSavedProjectsRaw() {
  return safeReadArray(SAVED_PROJECTS_KEY);
}

function writeSavedProjectsRaw(list) {
  return safeWriteValue(SAVED_PROJECTS_KEY, list);
}

// Full, real project records (raw structure), newest-updated first.
function getSavedProjects() {
  const list = readSavedProjectsRaw();
  return list.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getProjectById(id) {
  return readSavedProjectsRaw().find((p) => p.id === id) || null;
}

// Creates a brand new project. Called only by "Save to Project".
// Always returns the constructed record (so callers that read
// created.id right away never crash) — but only marks data as changed
// when the write actually persisted, so a rare storage failure can't
// silently masquerade as a successful save at the metadata level.
//
// NOTE: this legacy form cannot tell a caller whether the write
// actually persisted (it always returns a record). Callers that need
// to know — anywhere a UI would otherwise report "Saved" — should use
// saveProjectWithStatus() below instead. Kept as-is for existing
// callers (e.g. loadSampleData-adjacent code) that only need the
// constructed object.
function saveProject(project) {
  return saveProjectWithStatus(project).record;
}

// Same as saveProject(), but reports whether the write actually
// persisted: { ok, record }. ok is false when localStorage rejected
// the write (quota exceeded, disabled, etc.) — record is still
// returned (matching saveProject()'s contract) but callers that care
// about real persistence must check ok before claiming success.
function saveProjectWithStatus(project) {
  const now = new Date().toISOString();
  const record = {
    ...project,
    id: project.id || ("proj_" + Date.now() + "_" + idSuffix()),
    status: project.status || "draft",
    createdAt: project.createdAt || now,
    updatedAt: now,
  };
  const list = readSavedProjectsRaw();
  list.push(record);
  const ok = writeSavedProjectsRaw(list);
  if (ok) markDataChanged();
  return { ok, record };
}

// Full update of an existing project (e.g. "Edit Pricing"). Keeps id
// and createdAt, refreshes updatedAt. Returns null if the project
// wasn't found, OR if the write failed to persist — either way, no
// caller should treat the update as having taken effect.
//
// NOTE: like saveProject(), this legacy form collapses "not found" and
// "write failed" into the same null result. Callers that branch on
// *why* it failed (e.g. a save flow deciding whether a fallback create
// is appropriate) should use updateProjectWithStatus() below instead.
function updateProject(id, patch) {
  return updateProjectWithStatus(id, patch).record;
}

// Same as updateProject(), but reports *why* it failed:
// { ok, reason, record } where reason is null on success,
// "not_found" if no project with this id exists, or "write_failed" if
// the record was found but persisting the change was rejected by
// localStorage. This distinction matters: a fallback "create as new"
// is only ever appropriate for "not_found" — never for "write_failed",
// since storage that just rejected an update would likely reject the
// fallback create too, and a caller that doesn't check would report a
// false success either way.
function updateProjectWithStatus(id, patch) {
  const list = readSavedProjectsRaw();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, reason: "not_found", record: null };
  const updated = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  if (!writeSavedProjectsRaw(list)) return { ok: false, reason: "write_failed", record: null };
  markDataChanged();
  return { ok: true, reason: null, record: updated };
}

// Status-only change, used by the status dropdown in Project Detail.
function updateProjectStatus(id, status) {
  return updateProject(id, { status });
}

// Returns true only if a project was actually found, removed, AND the
// removal was persisted — false for "didn't exist" (e.g. a double
// delete) and for a storage write failure alike, so lastDataChangedAt
// only ever reflects a real change.
function deleteProject(id) {
  const list = readSavedProjectsRaw();
  const filtered = list.filter((p) => p.id !== id);
  if (filtered.length === list.length) return false;
  if (!writeSavedProjectsRaw(filtered)) return false;
  markDataChanged();
  return true;
}

/* ---- Dashboard-facing views ---- */

// Recent Projects table (Dashboard): top 5 by updatedAt. Returns an
// empty list — never fake rows — until the user has a real project.
function getProjects() {
  const saved = getSavedProjects();
  if (!saved.length) return [];

  return saved.slice(0, 5).map((p) => ({
    id: p.id,
    name: p.name,
    client: p.client || "\u2014",
    price: p.price,
    priceUnit: "",
    status: p.status || "draft",
    updated: formatSavedDate(p.updatedAt),
  }));
}

function getSummary() {
  const saved = getSavedProjects();
  if (!saved.length) {
    return {
      totalProjects: { value: 0, deltaLabel: t("dashboard.summary.noProjectsYet"), direction: "up" },
      totalRevenue: { value: 0, deltaLabel: t("dashboard.summary.fromApprovedCompleted"), direction: "up" },
      pendingProposals: { value: 0, caption: t("dashboard.summary.waitingForClientResponse") },
      approvedCount: { value: 0, caption: t("dashboard.summary.approvedProjects") },
    };
  }

  const totalProjects = saved.length;
  const pendingProposals = saved.filter((p) => p.status === "proposal-sent").length;
  const approvedCount = saved.filter((p) => p.status === "approved").length;
  const totalRevenue = saved
    .filter((p) => p.status === "approved" || p.status === "completed")
    .reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  return {
    totalProjects: {
      value: totalProjects,
      deltaLabel: t(totalProjects === 1 ? "dashboard.summary.totalProject.one" : "dashboard.summary.totalProject.other", { n: totalProjects }),
      direction: "up",
    },
    totalRevenue: { value: totalRevenue, deltaLabel: t("dashboard.summary.fromApprovedCompleted"), direction: "up" },
    pendingProposals: { value: pendingProposals, caption: t("dashboard.summary.waitingForClientResponse") },
    approvedCount: { value: approvedCount, caption: t("dashboard.summary.approvedProjects") },
  };
}

function getUser() {
  return user;
}

function getStatusMeta(statusKey) {
  return STATUS_META[statusKey] || { label: statusKey, badgeClass: "badge-draft" };
}

/* ==========================================================================
   QUOTATIONS
   A quotation is a standalone SNAPSHOT document — it copies project data
   at creation time and never writes back to the project. If the
   project's pricing changes later, quotations already created stay
   exactly as they were.
   ========================================================================== */

const SAVED_QUOTATIONS_KEY = "freelance-kit-saved-quotations";
const BUSINESS_PROFILE_KEY = "freelance-kit-business-profile";

function readSavedQuotationsRaw() {
  return safeReadArray(SAVED_QUOTATIONS_KEY);
}

function writeSavedQuotationsRaw(list) {
  return safeWriteValue(SAVED_QUOTATIONS_KEY, list);
}

function getSavedQuotations() {
  return readSavedQuotationsRaw().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getQuotationById(id) {
  return readSavedQuotationsRaw().find((q) => q.id === id) || null;
}

function getQuotationsByProjectId(projectId) {
  if (!projectId) return [];
  return getSavedQuotations().filter((q) => q.projectId === projectId);
}

// QT-YYYYMM-001. Numbering follows the HIGHEST existing number for the
// current year+month, plus 1 — never a count, never a gap-fill. This
// means: existing numbers are never renumbered, and if the highest
// number is deleted, the next quotation naturally reuses it (since the
// "highest remaining" recalculates fresh every time this runs).
function generateQuotationNumber() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `QT-${yyyymm}-`;

  const highest = readSavedQuotationsRaw()
    .map((q) => q.quotationNumber || "")
    .filter((num) => num.startsWith(prefix))
    .map((num) => parseInt(num.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return prefix + String(highest + 1).padStart(3, "0");
}

const QUOTATION_STATUS_META = {
  "draft":    { get label() { return t("status.draft"); },    badgeClass: "badge-draft" },
  "sent":     { get label() { return t("status.sent"); },     badgeClass: "badge-sent" },
  "accepted": { get label() { return t("status.accepted"); }, badgeClass: "badge-approved" },
  "rejected": { get label() { return t("status.rejected"); }, badgeClass: "badge-rejected" },
  "expired":  { get label() { return t("status.expired"); },  badgeClass: "badge-completed" },
};
const QUOTATION_STATUS_ORDER = ["draft", "sent", "accepted", "rejected", "expired"];

function getQuotationStatusMeta(statusKey) {
  return QUOTATION_STATUS_META[statusKey] || { label: statusKey, badgeClass: "badge-draft" };
}

function saveQuotation(quotation) {
  return saveQuotationWithStatus(quotation).record;
}

// See saveProjectWithStatus() for why this exists: reports { ok, record }
// so a caller can tell a real persisted save from a rejected write.
function saveQuotationWithStatus(quotation) {
  const now = new Date().toISOString();
  const record = {
    ...quotation,
    id: quotation.id || ("quo_" + Date.now() + "_" + idSuffix()),
    status: quotation.status || "draft",
    createdAt: quotation.createdAt || now,
    updatedAt: now,
  };
  const list = readSavedQuotationsRaw();
  list.push(record);
  const ok = writeSavedQuotationsRaw(list);
  if (ok) markDataChanged();
  return { ok, record };
}

function updateQuotation(id, patch) {
  return updateQuotationWithStatus(id, patch).record;
}

// See updateProjectWithStatus() for why this exists: distinguishes
// "not_found" from "write_failed" so callers only fall back to
// creating a new record when the original one is genuinely gone.
function updateQuotationWithStatus(id, patch) {
  const list = readSavedQuotationsRaw();
  const idx = list.findIndex((q) => q.id === id);
  if (idx === -1) return { ok: false, reason: "not_found", record: null };
  const updated = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  if (!writeSavedQuotationsRaw(list)) return { ok: false, reason: "write_failed", record: null };
  markDataChanged();
  return { ok: true, reason: null, record: updated };
}

function updateQuotationStatus(id, status) {
  return updateQuotation(id, { status });
}

function deleteQuotation(id) {
  const list = readSavedQuotationsRaw();
  const filtered = list.filter((q) => q.id !== id);
  if (filtered.length === list.length) return false;
  if (!writeSavedQuotationsRaw(filtered)) return false;
  markDataChanged();
  return true;
}

// Business profile — ONE shared identity used by Quotation, Proposal,
// and Invoice Generator alike (plus richer fields managed from the
// Business Settings page). Field names are intentionally the same
// ones the three generators have always used (businessName,
// businessEmail, businessPhone, businessWebsite, businessAddress,
// logo) so nothing there needs to change — Settings just adds more
// fields alongside them.
function getBusinessProfile() {
  return safeReadObject(BUSINESS_PROFILE_KEY);
}

function saveBusinessProfile(profile) {
  const ok = safeWriteValue(BUSINESS_PROFILE_KEY, profile);
  if (ok) markDataChanged();
  return ok;
}

// Partial save that merges into the existing profile instead of
// replacing it — this is what Quotation/Proposal/Invoice Generator
// call after each save, so their handful of business fields never
// wipe out the richer profile (tagline, payment info, colors, etc.)
// managed from Business Settings. Returns the merged profile on
// success, or null if the write didn't persist.
function mergeBusinessProfile(patch) {
  const current = getBusinessProfile() || {};
  const merged = { ...current, ...patch };
  return saveBusinessProfile(merged) ? merged : null;
}

function resetBusinessProfile() {
  const ok = safeRemoveValue(BUSINESS_PROFILE_KEY);
  if (ok) markDataChanged();
  return ok;
}

// Simple completeness score used by the Dashboard's Business Profile
// card. No scoring system beyond "how many of these 7 are filled in".
const PROFILE_COMPLETENESS_FIELDS = [
  { key: "businessName", label: "Business Name" },
  { key: "logo", label: "Logo" },
  { key: "businessEmail", label: "Email" },
  { key: "businessPhone", label: "Phone" },
  { key: "businessAddress", label: "Address" },
  { key: "bankName", label: "Bank" },
  { key: "businessWebsite", label: "Website" },
];

function getProfileCompleteness() {
  const profile = getBusinessProfile() || {};
  const filled = PROFILE_COMPLETENESS_FIELDS.filter((f) => (profile[f.key] || "").toString().trim()).length;
  const total = PROFILE_COMPLETENESS_FIELDS.length;
  return { filled, total, percent: Math.round((filled / total) * 100) };
}

/* ==========================================================================
   PROPOSALS
   Same idea as quotations: a standalone SNAPSHOT of project data at
   creation time. Editing a proposal never writes back to the project
   or to any quotation — the three are separate, related-by-id records.
   ========================================================================== */

const SAVED_PROPOSALS_KEY = "freelance-kit-saved-proposals";

function readSavedProposalsRaw() {
  return safeReadArray(SAVED_PROPOSALS_KEY);
}

function writeSavedProposalsRaw(list) {
  return safeWriteValue(SAVED_PROPOSALS_KEY, list);
}

function getSavedProposals() {
  return readSavedProposalsRaw().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getProposalById(id) {
  return readSavedProposalsRaw().find((p) => p.id === id) || null;
}

function getProposalsByProjectId(projectId) {
  if (!projectId) return [];
  return getSavedProposals().filter((p) => p.projectId === projectId);
}

// PR-YYYYMM-001 — same rule as quotations: highest existing number for
// the current year+month, plus 1. Never renumbers, never fills gaps.
function generateProposalNumber() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `PR-${yyyymm}-`;

  const highest = readSavedProposalsRaw()
    .map((p) => p.proposalNumber || "")
    .filter((num) => num.startsWith(prefix))
    .map((num) => parseInt(num.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return prefix + String(highest + 1).padStart(3, "0");
}

const PROPOSAL_STATUS_META = {
  "draft":    { get label() { return t("status.draft"); },    badgeClass: "badge-draft" },
  "sent":     { get label() { return t("status.sent"); },     badgeClass: "badge-sent" },
  "accepted": { get label() { return t("status.accepted"); }, badgeClass: "badge-approved" },
  "rejected": { get label() { return t("status.rejected"); }, badgeClass: "badge-rejected" },
};
const PROPOSAL_STATUS_ORDER = ["draft", "sent", "accepted", "rejected"];

function getProposalStatusMeta(statusKey) {
  return PROPOSAL_STATUS_META[statusKey] || { label: statusKey, badgeClass: "badge-draft" };
}

function saveProposal(proposal) {
  return saveProposalWithStatus(proposal).record;
}

function saveProposalWithStatus(proposal) {
  const now = new Date().toISOString();
  const record = {
    ...proposal,
    id: proposal.id || ("prop_" + Date.now() + "_" + idSuffix()),
    status: proposal.status || "draft",
    createdAt: proposal.createdAt || now,
    updatedAt: now,
  };
  const list = readSavedProposalsRaw();
  list.push(record);
  const ok = writeSavedProposalsRaw(list);
  if (ok) markDataChanged();
  return { ok, record };
}

function updateProposal(id, patch) {
  return updateProposalWithStatus(id, patch).record;
}

function updateProposalWithStatus(id, patch) {
  const list = readSavedProposalsRaw();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, reason: "not_found", record: null };
  const updated = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  if (!writeSavedProposalsRaw(list)) return { ok: false, reason: "write_failed", record: null };
  markDataChanged();
  return { ok: true, reason: null, record: updated };
}

function updateProposalStatus(id, status) {
  return updateProposal(id, { status });
}

function deleteProposal(id) {
  const list = readSavedProposalsRaw();
  const filtered = list.filter((p) => p.id !== id);
  if (filtered.length === list.length) return false;
  if (!writeSavedProposalsRaw(filtered)) return false;
  markDataChanged();
  return true;
}

/* ==========================================================================
   INVOICES
   Same idea as quotations/proposals: a standalone SNAPSHOT of project
   data at creation time. Never writes back to the project, quotation,
   or proposal — all four are separate, related-by-id records.
   ========================================================================== */

const SAVED_INVOICES_KEY = "freelance-kit-saved-invoices";

function readSavedInvoicesRaw() {
  return safeReadArray(SAVED_INVOICES_KEY);
}

function writeSavedInvoicesRaw(list) {
  return safeWriteValue(SAVED_INVOICES_KEY, list);
}

function getSavedInvoices() {
  return readSavedInvoicesRaw().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getInvoiceById(id) {
  return readSavedInvoicesRaw().find((i) => i.id === id) || null;
}

function getInvoicesByProjectId(projectId) {
  if (!projectId) return [];
  return getSavedInvoices().filter((i) => i.projectId === projectId);
}

// INV-YYYYMM-001 — same rule as quotations/proposals: highest existing
// number for the current year+month, plus 1. Never renumbers, never
// fills gaps.
function generateInvoiceNumber() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${yyyymm}-`;

  const highest = readSavedInvoicesRaw()
    .map((i) => i.invoiceNumber || "")
    .filter((num) => num.startsWith(prefix))
    .map((num) => parseInt(num.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return prefix + String(highest + 1).padStart(3, "0");
}

const INVOICE_STATUS_META = {
  "draft":   { get label() { return t("status.draft"); },   badgeClass: "badge-draft" },
  "sent":    { get label() { return t("status.sent"); },    badgeClass: "badge-sent" },
  "paid":    { get label() { return t("status.paid"); },    badgeClass: "badge-approved" },
  "overdue": { get label() { return t("status.overdue"); }, badgeClass: "badge-rejected" },
};
const INVOICE_STATUS_ORDER = ["draft", "sent", "paid", "overdue"];

function getInvoiceStatusMeta(statusKey) {
  return INVOICE_STATUS_META[statusKey] || { label: statusKey, badgeClass: "badge-draft" };
}

function saveInvoice(invoice) {
  return saveInvoiceWithStatus(invoice).record;
}

function saveInvoiceWithStatus(invoice) {
  const now = new Date().toISOString();
  const record = {
    ...invoice,
    id: invoice.id || ("inv_" + Date.now() + "_" + idSuffix()),
    status: invoice.status || "draft",
    createdAt: invoice.createdAt || now,
    updatedAt: now,
  };
  const list = readSavedInvoicesRaw();
  list.push(record);
  const ok = writeSavedInvoicesRaw(list);
  if (ok) markDataChanged();
  return { ok, record };
}

function updateInvoice(id, patch) {
  return updateInvoiceWithStatus(id, patch).record;
}

function updateInvoiceWithStatus(id, patch) {
  const list = readSavedInvoicesRaw();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return { ok: false, reason: "not_found", record: null };
  const updated = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  if (!writeSavedInvoicesRaw(list)) return { ok: false, reason: "write_failed", record: null };
  markDataChanged();
  return { ok: true, reason: null, record: updated };
}

function updateInvoiceStatus(id, status) {
  return updateInvoice(id, { status });
}

function deleteInvoice(id) {
  const list = readSavedInvoicesRaw();
  const filtered = list.filter((i) => i.id !== id);
  if (filtered.length === list.length) return false;
  if (!writeSavedInvoicesRaw(filtered)) return false;
  markDataChanged();
  return true;
}

/* ==========================================================================
   RATE CARDS
   Unlike quotations/proposals/invoices, a rate card isn't tied to one
   client or deal — it's a general service price list a freelancer
   hands out. No client fields, no sequential numbering; identified by
   title instead.
   ========================================================================== */

const SAVED_RATE_CARDS_KEY = "freelance-kit-saved-rate-cards";

function readSavedRateCardsRaw() {
  return safeReadArray(SAVED_RATE_CARDS_KEY);
}

function writeSavedRateCardsRaw(list) {
  return safeWriteValue(SAVED_RATE_CARDS_KEY, list);
}

function getSavedRateCards() {
  return readSavedRateCardsRaw().slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getRateCardById(id) {
  return readSavedRateCardsRaw().find((r) => r.id === id) || null;
}

function saveRateCard(rateCard) {
  return saveRateCardWithStatus(rateCard).record;
}

function saveRateCardWithStatus(rateCard) {
  const now = new Date().toISOString();
  const record = {
    ...rateCard,
    id: rateCard.id || ("rate_" + Date.now() + "_" + idSuffix()),
    createdAt: rateCard.createdAt || now,
    updatedAt: now,
  };
  const list = readSavedRateCardsRaw();
  list.push(record);
  const ok = writeSavedRateCardsRaw(list);
  if (ok) markDataChanged();
  return { ok, record };
}

function updateRateCard(id, patch) {
  return updateRateCardWithStatus(id, patch).record;
}

function updateRateCardWithStatus(id, patch) {
  const list = readSavedRateCardsRaw();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, reason: "not_found", record: null };
  const updated = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  if (!writeSavedRateCardsRaw(list)) return { ok: false, reason: "write_failed", record: null };
  markDataChanged();
  return { ok: true, reason: null, record: updated };
}

function deleteRateCard(id) {
  const list = readSavedRateCardsRaw();
  const filtered = list.filter((r) => r.id !== id);
  if (filtered.length === list.length) return false;
  if (!writeSavedRateCardsRaw(filtered)) return false;
  markDataChanged();
  return true;
}

/* ==========================================================================
   TEMPLATES
   Reusable named bundles of line items (description/qty/unitPrice) that
   speed up building a new Quotation or Invoice — pick a template and
   its items get appended to whatever's already on the form.
   ========================================================================== */

const SAVED_TEMPLATES_KEY = "freelance-kit-saved-templates";

function readSavedTemplatesRaw() {
  return safeReadArray(SAVED_TEMPLATES_KEY);
}

function writeSavedTemplatesRaw(list) {
  return safeWriteValue(SAVED_TEMPLATES_KEY, list);
}

function getSavedTemplates() {
  return readSavedTemplatesRaw().slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getTemplateById(id) {
  return readSavedTemplatesRaw().find((t) => t.id === id) || null;
}

function saveTemplate(template) {
  return saveTemplateWithStatus(template).record;
}

function saveTemplateWithStatus(template) {
  const now = new Date().toISOString();
  const record = {
    ...template,
    id: template.id || ("tpl_" + Date.now() + "_" + idSuffix()),
    createdAt: template.createdAt || now,
    updatedAt: now,
  };
  const list = readSavedTemplatesRaw();
  list.push(record);
  const ok = writeSavedTemplatesRaw(list);
  if (ok) markDataChanged();
  return { ok, record };
}

function updateTemplate(id, patch) {
  return updateTemplateWithStatus(id, patch).record;
}

function updateTemplateWithStatus(id, patch) {
  const list = readSavedTemplatesRaw();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return { ok: false, reason: "not_found", record: null };
  const updated = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  if (!writeSavedTemplatesRaw(list)) return { ok: false, reason: "write_failed", record: null };
  markDataChanged();
  return { ok: true, reason: null, record: updated };
}

function deleteTemplate(id) {
  const list = readSavedTemplatesRaw();
  const filtered = list.filter((t) => t.id !== id);
  if (filtered.length === list.length) return false;
  if (!writeSavedTemplatesRaw(filtered)) return false;
  markDataChanged();
  return true;
}

/* ==========================================================================
   MEANINGFUL APPLICATION DATA — single source of truth for "does this
   user actually have any saved business records", used by both the
   Dashboard (welcome vs. normal view) and the Backup Reminder (whether
   there's anything worth nudging about). A user with only Quotations
   and no Projects, for example, still has real activity — Projects is
   just one of six record types, not a gate for the other five.
   ========================================================================== */

function hasAppData() {
  return (
    getSavedProjects().length > 0 ||
    getSavedQuotations().length > 0 ||
    getSavedProposals().length > 0 ||
    getSavedInvoices().length > 0 ||
    getSavedRateCards().length > 0 ||
    getSavedTemplates().length > 0 ||
    hasMeaningfulBusinessProfile()
  );
}

// A profile object exists as soon as Settings is opened/saved once,
// even with nothing filled in — so "exists" isn't the same as
// "meaningful". Reuses the exact same field list getProfileCompleteness()
// scores against, rather than a second hand-picked list.
function hasMeaningfulBusinessProfile() {
  const profile = getBusinessProfile();
  if (!profile) return false;
  return PROFILE_COMPLETENESS_FIELDS.some((f) => (profile[f.key] || "").toString().trim());
}

/* ==========================================================================
   LAST BACKUP TIMESTAMP
   Small piece of metadata (not app content) so Settings can show "Last
   backup: ..." — set only when a backup download actually completes.
   ========================================================================== */

const LAST_BACKUP_KEY = "freelance-kit-last-backup-at";

function getLastBackupAt() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch (err) {
    return null;
  }
}

function setLastBackupAt(isoString) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, isoString);
  } catch (err) {
    /* ignore */
  }
}

/* ==========================================================================
   LAST DATA CHANGE TIMESTAMP
   Updated by every real save/update/delete above (projects, quotations,
   proposals, invoices, rate cards, templates, business profile) — used
   only to tell the Dashboard backup reminder "you've changed things
   since your last backup". Never touched by UI-only state, and never
   touched by restore/clear (backup.js sets it explicitly there instead,
   since replacing the whole dataset is itself a meaningful change).
   ========================================================================== */

const LAST_DATA_CHANGE_KEY = "freelance-kit-last-data-change-at";

function markDataChanged() {
  try {
    localStorage.setItem(LAST_DATA_CHANGE_KEY, new Date().toISOString());
  } catch (err) {
    /* ignore */
  }
}

function getLastDataChangedAt() {
  try {
    return localStorage.getItem(LAST_DATA_CHANGE_KEY);
  } catch (err) {
    return null;
  }
}

/* ==========================================================================
   BACKUP REMINDER SNOOZE
   "Remind Me Later" on the Dashboard reminder — stores when the person
   snoozed it so it can reasonably stay quiet for a while instead of
   nagging on every visit. Purely a UI preference, not app content, so
   it's intentionally left out of backups and untouched by restore/clear.
   ========================================================================== */

const BACKUP_REMINDER_SNOOZE_KEY = "freelance-kit-backup-reminder-snoozed-at";

function getBackupReminderSnoozedAt() {
  try {
    return localStorage.getItem(BACKUP_REMINDER_SNOOZE_KEY);
  } catch (err) {
    return null;
  }
}

function setBackupReminderSnoozedAt(isoString) {
  try {
    localStorage.setItem(BACKUP_REMINDER_SNOOZE_KEY, isoString);
  } catch (err) {
    /* ignore */
  }
}
