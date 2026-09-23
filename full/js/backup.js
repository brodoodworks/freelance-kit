/* ==========================================================================
   BACKUP.JS
   Backup & Restore for Settings > Data & Backup.

   Backs up exactly the data the app actually persists (audited against
   data.js's own localStorage keys — nothing guessed):
     - freelance-kit-business-profile
     - freelance-kit-saved-projects
     - freelance-kit-saved-quotations
     - freelance-kit-saved-proposals
     - freelance-kit-saved-invoices
     - freelance-kit-saved-rate-cards
     - freelance-kit-saved-templates
   UI-only preferences (theme, sidebar-collapsed) are intentionally left
   out — they aren't user content, and restoring them on another device
   would be surprising rather than helpful. There is no separate document
   numbering counter to back up: quotation/proposal/invoice numbers are
   always derived live from the saved documents themselves (see
   generateQuotationNumber() etc. in data.js), so restoring the documents
   automatically keeps numbering correct.
   ========================================================================== */

const BACKUP_APP_ID = "freelance-kit";
const BACKUP_VERSION = 1;

const backupCard = document.querySelector('[data-backup-card]');

if (backupCard) {

  const downloadBtn = backupCard.querySelector('[data-backup-download]');
  const lastBackupEl = backupCard.querySelector('[data-backup-last]');
  const fileInput = backupCard.querySelector('[data-backup-file-input]');
  const errorEl = backupCard.querySelector('[data-backup-error]');
  const previewEl = backupCard.querySelector('[data-backup-preview]');

  const restoreOverlay = document.querySelector('[data-restore-overlay]');
  const restoreModalDate = document.querySelector('[data-restore-modal-date]');
  const restoreConfirmBtn = document.querySelector('[data-restore-confirm]');
  const restoreCancelBtn = document.querySelector('[data-restore-cancel]');

  const clearOverlay = document.querySelector('[data-clear-overlay]');
  const clearConfirmInput = document.querySelector('[data-clear-confirm-input]');
  const clearConfirmBtn = document.querySelector('[data-clear-confirm]');
  const clearCancelBtn = document.querySelector('[data-clear-cancel]');
  const clearAllBtn = document.querySelector('[data-backup-clear-all]');

  // The six real data lists this app persists, keyed by both the label
  // shown in the preview and the read/write functions already used
  // everywhere else in the app (never touching localStorage directly).
  // labelKey resolves through t() at render time so the preview stays
  // correct if the language changes; label itself is kept only as an
  // English fallback identifier, never shown directly.
  const DATA_SECTIONS = [
    { key: "projects", labelKey: "backup.section.projects", read: () => getSavedProjects(), write: (list) => writeSavedProjectsRaw(list) },
    { key: "quotations", labelKey: "backup.section.quotations", read: () => getSavedQuotations(), write: (list) => writeSavedQuotationsRaw(list) },
    { key: "proposals", labelKey: "backup.section.proposals", read: () => getSavedProposals(), write: (list) => writeSavedProposalsRaw(list) },
    { key: "invoices", labelKey: "backup.section.invoices", read: () => getSavedInvoices(), write: (list) => writeSavedInvoicesRaw(list) },
    { key: "rateCards", labelKey: "backup.section.rateCards", read: () => getSavedRateCards(), write: (list) => writeSavedRateCardsRaw(list) },
    { key: "templates", labelKey: "backup.section.templates", read: () => getSavedTemplates(), write: (list) => writeSavedTemplatesRaw(list) },
  ];

  /* ---------------------------------------------------------------------
     LAST BACKUP TIMESTAMP
     --------------------------------------------------------------------- */

  function formatBackupTimestamp(isoString) {
    try {
      return new Date(isoString).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
    } catch (err) {
      return isoString;
    }
  }

  function formatBackupTimestampWithTime(isoString) {
    try {
      const datePart = new Date(isoString).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
      const timePart = new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${datePart}, ${timePart}`;
    } catch (err) {
      return isoString;
    }
  }

  function renderLastBackup() {
    const last = getLastBackupAt();
    lastBackupEl.textContent = last
      ? t("backup.lastCreated", { date: formatBackupTimestampWithTime(last) })
      : t("backup.lastCreated.never");
  }

  /* ---------------------------------------------------------------------
     SECTION 1 — BACKUP (download)
     --------------------------------------------------------------------- */

  function collectBackupPayload() {
    const data = { businessProfile: getBusinessProfile() || null };
    DATA_SECTIONS.forEach((section) => { data[section.key] = section.read(); });

    return {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };
  }

  // The one real download flow — used by the Settings "Download Backup"
  // button AND by the Dashboard backup reminder's "Back Up Now"/"Create
  // New Backup" buttons (via window.FreelanceBackup.downloadBackup),
  // so there is exactly one place this logic lives.
  function performBackupDownload() {
    const payload = collectBackupPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${BACKUP_APP_ID}-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // "Last backup created" — and only this — is what marks the data as
    // backed up. Restore never touches this (see SECTION 2): restoring
    // FROM a file is not the same as the user creating a NEW backup.
    setLastBackupAt(new Date().toISOString());
    renderLastBackup();
    if (window.FreelanceBackupReminder) window.FreelanceBackupReminder.refresh();
    if (window.FreelanceDashboardBackupCard) window.FreelanceDashboardBackupCard.refresh();

    // Deliberately not "your data is safely backed up" — the app has no
    // way to know whether the downloaded file still exists anywhere.
    if (typeof showToast === "function") {
      showToast(t("backup.downloaded.title"), t("backup.downloaded.detail"));
    }
  }

  downloadBtn.addEventListener("click", performBackupDownload);

  /* ---------------------------------------------------------------------
     SECTION 2 — RESTORE (validate, preview, confirm)
     --------------------------------------------------------------------- */

  let pendingBackup = null; // the validated payload, waiting on modal confirmation

  function showBackupError(title, text) {
    errorEl.hidden = false;
    errorEl.innerHTML = `<strong>${title}</strong> \u2014 ${text}`;
    previewEl.hidden = true;
    previewEl.innerHTML = "";
  }
  function clearBackupError() {
    errorEl.hidden = true;
    errorEl.innerHTML = "";
  }

  // Basic-but-real structural validation — never guesses, never assumes
  // a field exists. Missing lists are treated as empty (0), not errors,
  // since an old or intentionally partial backup should still preview.
  function validateBackup(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, code: "not-backup" };
    }
    if (!parsed.data || typeof parsed.data !== "object" || typeof parsed.version !== "number") {
      return { ok: false, code: "not-backup" };
    }
    if (parsed.app !== BACKUP_APP_ID) {
      return { ok: false, code: "not-backup" };
    }
    if (parsed.version > BACKUP_VERSION) {
      return { ok: false, code: "unsupported-version" };
    }
    // Every list field, if present, must actually be an array.
    for (const section of DATA_SECTIONS) {
      const value = parsed.data[section.key];
      if (value !== undefined && !Array.isArray(value)) {
        return { ok: false, code: "not-backup" };
      }
    }
    if (parsed.data.businessProfile !== undefined && parsed.data.businessProfile !== null && typeof parsed.data.businessProfile !== "object") {
      return { ok: false, code: "not-backup" };
    }
    return { ok: true };
  }

  function renderBackupPreview(payload) {
    const counts = DATA_SECTIONS.map((section) => ({
      label: t(section.labelKey),
      count: Array.isArray(payload.data[section.key]) ? payload.data[section.key].length : 0,
    }));

    const dateStr = escapeBackupHtml(formatBackupTimestamp(payload.exportedAt));
    const metaLine = payload.version
      ? t("backup.preview.metaWithVersion", { date: dateStr, version: escapeBackupHtml(String(payload.version)) })
      : t("backup.preview.meta", { date: dateStr });

    previewEl.hidden = false;
    previewEl.innerHTML = `
      <p class="backup-preview-title">${t("backup.preview.title")}</p>
      <p class="backup-preview-meta">${metaLine}</p>
      <div class="backup-preview-counts">
        ${counts.map((c) => `
          <div>
            <span class="backup-preview-count-value">${c.count}</span>
            <span class="backup-preview-count-label">${escapeBackupHtml(c.label)}</span>
          </div>
        `).join("")}
      </div>
      <div class="backup-preview-actions">
        <button type="button" class="btn btn-danger" data-backup-restore-open>${t("backup.restoreData")}</button>
        <button type="button" class="btn btn-secondary" data-backup-restore-dismiss>${t("backup.chooseDifferentFile")}</button>
      </div>
    `;

    previewEl.querySelector('[data-backup-restore-open]').addEventListener("click", () => {
      openRestoreModal(payload);
    });
    previewEl.querySelector('[data-backup-restore-dismiss]').addEventListener("click", () => {
      dismissPreview();
    });
  }

  function escapeBackupHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function dismissPreview() {
    pendingBackup = null;
    previewEl.hidden = true;
    previewEl.innerHTML = "";
    fileInput.value = "";
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    clearBackupError();
    previewEl.hidden = true;
    previewEl.innerHTML = "";

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        showBackupError(t("backup.error.invalidFile.title"), t("backup.error.invalidFile.detail"));
        fileInput.value = "";
        return;
      }

      const result = validateBackup(parsed);
      if (!result.ok) {
        if (result.code === "unsupported-version") {
          showBackupError(t("backup.error.unsupportedVersion.title"), t("backup.error.unsupportedVersion.detail"));
        } else {
          showBackupError(t("backup.error.invalid.title"), t("backup.error.invalid.detail"));
        }
        fileInput.value = "";
        return;
      }

      pendingBackup = parsed;
      renderBackupPreview(parsed);
    };
    reader.onerror = () => {
      showBackupError(t("backup.error.invalidFile.title"), t("backup.error.invalidFile.detail"));
      fileInput.value = "";
    };
    reader.readAsText(file);
  });

  /* ---------------------------------------------------------------------
     RESTORE CONFIRMATION MODAL
     --------------------------------------------------------------------- */

  function openRestoreModal(payload) {
    restoreModalDate.textContent = formatBackupTimestamp(payload.exportedAt);
    restoreOverlay.hidden = false;
  }
  function closeRestoreModal() {
    restoreOverlay.hidden = true;
  }

  if (restoreCancelBtn) restoreCancelBtn.addEventListener("click", closeRestoreModal);
  if (restoreOverlay) {
    restoreOverlay.addEventListener("click", (e) => {
      if (e.target === restoreOverlay) closeRestoreModal();
    });
  }

  // Resets every generator/form's in-memory editing state so nothing is
  // left pointing at a project/document id that restore just replaced —
  // this is what prevents "half-updated" forms after a restore.
  function resetAllFormState() {
    if (window.FreelanceCalculator) window.FreelanceCalculator.resetToDefaults();
    if (window.FreelanceQuotation) window.FreelanceQuotation.startNew(null);
    if (window.FreelanceProposal) window.FreelanceProposal.startNew(null);
    if (window.FreelanceInvoice) window.FreelanceInvoice.startNew(null);
    if (window.FreelanceRateCard) window.FreelanceRateCard.startNew();
    if (window.FreelanceTemplates) window.FreelanceTemplates.resetForm();
    // Unlike refreshEverything()'s background-safe profile-card-only
    // refresh, a restore/clear is an explicit, confirmed replacement of
    // all data — so overwriting the Settings form here is correct, not
    // a surprise wipe of unsaved edits.
    if (window.FreelanceSettings) window.FreelanceSettings.loadIntoForm();
  }

  if (restoreConfirmBtn) {
    restoreConfirmBtn.addEventListener("click", () => {
      if (!pendingBackup) { closeRestoreModal(); return; }

      // In-memory safety snapshot of current data, rolled back to if
      // any write below doesn't actually persist.
      const safetySnapshot = collectBackupPayload();

      // The write helpers report real success/failure instead of
      // throwing (a storage failure is caught and swallowed at the
      // data-layer level, by design, so it can be reported rather than
      // crashing) — so failure is detected by checking their return
      // value, not by try/catch.
      let allWritesOk = true;
      DATA_SECTIONS.forEach((section) => {
        const list = Array.isArray(pendingBackup.data[section.key]) ? pendingBackup.data[section.key] : [];
        if (!section.write(list)) allWritesOk = false;
      });

      let profileOk;
      if (pendingBackup.data.businessProfile && typeof pendingBackup.data.businessProfile === "object") {
        profileOk = saveBusinessProfile(pendingBackup.data.businessProfile);
      } else {
        profileOk = resetBusinessProfile();
      }
      if (!profileOk) allWritesOk = false;

      if (!allWritesOk) {
        // Roll back to the safety snapshot so a partial failure never
        // leaves old and new data mixed together.
        DATA_SECTIONS.forEach((section) => { section.write(safetySnapshot.data[section.key] || []); });
        if (safetySnapshot.data.businessProfile) {
          saveBusinessProfile(safetySnapshot.data.businessProfile);
        } else {
          resetBusinessProfile();
        }
        closeRestoreModal();
        if (typeof refreshEverything === "function") refreshEverything();
        if (typeof showToast === "function") {
          showToast(t("backup.restoreFailed.title"), t("backup.restoreFailed.detail"));
        }
        return;
      }

      closeRestoreModal();
      dismissPreview();
      clearBackupError();
      resetAllFormState();
      // Restoring is itself a meaningful change to the current dataset —
      // mark it as such (this does NOT touch "last backup created", see
      // SECTION 10 in the reminder spec: restoring is not backing up).
      markDataChanged();
      if (typeof refreshEverything === "function") refreshEverything();
      if (window.FreelanceBackupReminder) window.FreelanceBackupReminder.refresh();
      if (typeof navigateTo === "function") {
        navigateTo("dashboard");
        history.replaceState(null, "", "#dashboard");
      }
      if (typeof showToast === "function") showToast(t("backup.restoredSuccessfully"));
    });
  }

  /* ---------------------------------------------------------------------
     SECTION 4 — CLEAR ALL DATA
     --------------------------------------------------------------------- */

  function openClearModal() {
    clearConfirmInput.value = "";
    clearConfirmBtn.disabled = true;
    clearOverlay.hidden = false;
  }
  function closeClearModal() {
    clearOverlay.hidden = true;
  }

  if (clearAllBtn) clearAllBtn.addEventListener("click", openClearModal);
  if (clearCancelBtn) clearCancelBtn.addEventListener("click", closeClearModal);
  if (clearOverlay) {
    clearOverlay.addEventListener("click", (e) => {
      if (e.target === clearOverlay) closeClearModal();
    });
  }
  if (clearConfirmInput) {
    clearConfirmInput.addEventListener("input", () => {
      clearConfirmBtn.disabled = clearConfirmInput.value.trim() !== "DELETE";
    });
  }

  if (clearConfirmBtn) {
    clearConfirmBtn.addEventListener("click", () => {
      if (clearConfirmInput.value.trim() !== "DELETE") return;

      // Remove only keys this app owns — never localStorage.clear(),
      // which would wipe unrelated data other sites/apps keep in this
      // same browser. UI-only prefs (theme, sidebar) and backup history
      // are left alone; they aren't user content.
      let allClearedOk = true;
      DATA_SECTIONS.forEach((section) => { if (!section.write([])) allClearedOk = false; });
      if (!resetBusinessProfile()) allClearedOk = false;

      closeClearModal();
      dismissPreview();
      clearBackupError();
      resetAllFormState();
      if (typeof refreshEverything === "function") refreshEverything();
      if (window.FreelanceBackupReminder) window.FreelanceBackupReminder.refresh();
      if (typeof navigateTo === "function") {
        navigateTo("dashboard");
        history.replaceState(null, "", "#dashboard");
      }
      if (typeof showToast === "function") {
        if (allClearedOk) {
          showToast(t("backup.allDataDeleted"));
        } else {
          showToast(t("backup.clearFailed.title"), t("backup.clearFailed.detail"));
        }
      }
    });
  }

  renderLastBackup();

  window.FreelanceBackup = { downloadBackup: performBackupDownload };
}
