/* ==========================================================================
   BACKUP-REMINDER.JS
   Dashboard "Backup Awareness & Reminder" — sits in the existing Data &
   Backup system (Settings), never a new sidebar destination. Purely
   informational: it tells the person their data is local and nudges
   them to back up, using only real, verifiable facts already tracked
   by backup.js / data.js (getLastBackupAt, getLastDataChangedAt).

   Three states, in priority order:
     1. Never backed up (and has real data)  -> "Protect Your Data"
     2. Backup exists but is old/stale        -> "May Be Outdated"
     3. Backup exists and is current          -> small positive line

   Never claims "your data is safely backed up" — the app has no way to
   verify the downloaded file still exists anywhere.
   ========================================================================== */

const BACKUP_REMINDER_OUTDATED_DAYS = 14;
const BACKUP_REMINDER_SNOOZE_DAYS = 7;

const backupReminderEl = document.querySelector('[data-backup-reminder]');

if (backupReminderEl) {

  // Reuses the app-wide hasAppData() (data.js) — same source of truth
  // the Dashboard uses to decide welcome-vs-normal view, so "is there
  // meaningful data" never disagrees between the two.
  function reminderHasMeaningfulData() {
    return hasAppData();
  }

  function daysBetween(fromIso, toIso) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / MS_PER_DAY;
  }

  function formatReminderDate(isoString) {
    try {
      const locale = getAppLanguage() === "id" ? "id-ID" : "en-US";
      return new Date(isoString).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    } catch (err) {
      return isoString;
    }
  }

  function isSnoozed() {
    const snoozedAt = getBackupReminderSnoozedAt();
    if (!snoozedAt) return false;
    return daysBetween(snoozedAt, new Date().toISOString()) < BACKUP_REMINDER_SNOOZE_DAYS;
  }

  // "Back Up Now" / "Create New Backup" — triggers the real, existing
  // download flow directly (no duplicated logic), falling back to just
  // opening Settings if that flow isn't available for some reason.
  function triggerBackupFromReminder() {
    if (window.FreelanceBackup && typeof window.FreelanceBackup.downloadBackup === "function") {
      window.FreelanceBackup.downloadBackup();
    } else if (typeof navigateTo === "function") {
      navigateTo("settings");
      history.replaceState(null, "", "#settings");
    }
  }

  const ICON_SHIELD = '<path d="M8 2 13.5 4v4.3c0 3.4-2.3 5.9-5.5 7.2C5.8 14.2 2.5 11.7 2.5 8.3V4L8 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>';
  const ICON_CLOCK = '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.8V8l2.4 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>';
  const ICON_CHECK = '<path d="M3.3 8.4 6.4 11.5l6.3-7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';

  function hideReminder() {
    backupReminderEl.hidden = true;
    backupReminderEl.innerHTML = "";
  }

  function renderNeverBackedUp() {
    backupReminderEl.hidden = false;
    backupReminderEl.innerHTML = `
      <div class="backup-reminder-row">
        <span class="backup-reminder-icon backup-reminder-icon-info"><svg width="16" height="16" viewBox="0 0 16 16" fill="none">${ICON_SHIELD}</svg></span>
        <div class="backup-reminder-body">
          <p class="backup-reminder-title">${t("backup.reminder.protectTitle")}</p>
          <p class="backup-reminder-text">${t("backup.reminder.protectText")}</p>
        </div>
        <div class="backup-reminder-actions">
          <button type="button" class="btn btn-primary btn-sm" data-backup-reminder-now>${t("backup.reminder.backUpNow")}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-backup-reminder-later>${t("backup.reminder.remindLater")}</button>
        </div>
      </div>`;

    backupReminderEl.querySelector('[data-backup-reminder-now]').addEventListener("click", triggerBackupFromReminder);
    backupReminderEl.querySelector('[data-backup-reminder-later]').addEventListener("click", () => {
      setBackupReminderSnoozedAt(new Date().toISOString());
      renderBackupReminder();
    });
  }

  function renderOutdated(lastBackupAt) {
    backupReminderEl.hidden = false;
    backupReminderEl.innerHTML = `
      <div class="backup-reminder-row">
        <span class="backup-reminder-icon backup-reminder-icon-warning"><svg width="16" height="16" viewBox="0 0 16 16" fill="none">${ICON_CLOCK}</svg></span>
        <div class="backup-reminder-body">
          <p class="backup-reminder-title">${t("backup.reminder.outdatedTitle")}</p>
          <p class="backup-reminder-text">${t("backup.reminder.outdatedText", { date: `<strong>${formatReminderDate(lastBackupAt)}</strong>` })}</p>
        </div>
        <div class="backup-reminder-actions">
          <button type="button" class="btn btn-primary btn-sm" data-backup-reminder-now>${t("action.createNewBackup")}</button>
        </div>
      </div>`;

    backupReminderEl.querySelector('[data-backup-reminder-now]').addEventListener("click", triggerBackupFromReminder);
  }

  function renderRecent(lastBackupAt) {
    backupReminderEl.hidden = false;
    backupReminderEl.innerHTML = `
      <div class="backup-reminder-row is-ok">
        <span class="backup-reminder-icon backup-reminder-icon-ok"><svg width="16" height="16" viewBox="0 0 16 16" fill="none">${ICON_CHECK}</svg></span>
        <div class="backup-reminder-body">
          <p class="backup-reminder-title">${t("backup.reminder.recentTitle", { date: formatReminderDate(lastBackupAt) })}</p>
        </div>
        <div class="backup-reminder-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-backup-reminder-now>${t("action.createNewBackup")}</button>
        </div>
      </div>`;

    backupReminderEl.querySelector('[data-backup-reminder-now]').addEventListener("click", triggerBackupFromReminder);
  }

  function renderBackupReminder() {
    if (!reminderHasMeaningfulData()) { hideReminder(); return; }

    const lastBackupAt = getLastBackupAt();

    if (!lastBackupAt) {
      if (isSnoozed()) { hideReminder(); return; }
      renderNeverBackedUp();
      return;
    }

    const now = new Date().toISOString();
    const daysSinceBackup = daysBetween(lastBackupAt, now);
    const lastChangeAt = getLastDataChangedAt();
    const changedSinceBackup = !!lastChangeAt && new Date(lastChangeAt).getTime() > new Date(lastBackupAt).getTime();

    if (daysSinceBackup >= BACKUP_REMINDER_OUTDATED_DAYS || changedSinceBackup) {
      renderOutdated(lastBackupAt);
      return;
    }

    renderRecent(lastBackupAt);
  }

  window.FreelanceBackupReminder = { refresh: renderBackupReminder };

  renderBackupReminder();
}
