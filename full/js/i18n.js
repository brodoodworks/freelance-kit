/* ==========================================================================
   I18N.JS
   Application UI language: English (default) or Bahasa Indonesia.
   This is a UI preference, not application/project data — same
   treatment as the Light/Dark theme setting (persisted separately,
   never mixed into backup/restore).

   SCOPE (read this before assuming something untranslated is a bug):
   This pass translates the app's structural chrome — sidebar, topbar,
   page titles, Dashboard, Settings (including this language control),
   and common actions/confirmations reused across every generator and
   list page (Save, Reset, Delete, Edit, Duplicate, Export PDF, status
   labels, empty-state patterns, etc.) via the data-i18n attribute
   system below. It does NOT translate the long-form Help & Support
   articles/FAQ or the field-by-field microcopy inside each generator
   form (labels like "Estimated Working Hours") — that's a large
   separate body of prose that needs its own dedicated pass. Nothing
   in either category is left broken; it simply stays in English in
   both language modes for now.

   ARCHITECTURE:
   - getAppLanguage() / setAppLanguage(lang) — persistence, mirrors
     the theme toggle's localStorage pattern exactly.
   - TRANSLATIONS.en / TRANSLATIONS.id — flat key → string (or
     key → function for count-aware strings) dictionaries.
   - t(key, vars) — looks up a key in the active language, falling
     back to English, then to the raw key itself (a visible fallback
     is more debuggable than a silently blank label).
   - applyStaticTranslations() — walks every element carrying
     data-i18n / data-i18n-placeholder / data-i18n-aria-label and sets
     its text/attribute from t(...). Called once on load; a language
     *switch* triggers a full reload (see Settings' language control)
     rather than a live re-render, so every already-rendered dynamic
     string (dates, statuses, counts) is guaranteed correct with zero
     risk of a half-updated page — acceptable here since all data is
     already persisted synchronously to localStorage before any
     reload could happen.
   ========================================================================== */

const LANGUAGE_KEY = "freelance-kit-language";

function getAppLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === "id" ? "id" : "en";
  } catch (err) {
    return "en";
  }
}

function setAppLanguage(lang) {
  const normalized = lang === "id" ? "id" : "en";
  try { localStorage.setItem(LANGUAGE_KEY, normalized); } catch (err) { /* ignore */ }
  document.documentElement.lang = normalized;
  return normalized;
}

// Document language — independent of the UI language above. Lets
// generated Quotations/Proposals/Invoices/Rate Cards be in a different
// language than the app interface itself (e.g. Bahasa Indonesia UI,
// English documents for international clients). "app" (the default,
// nothing saved) means "follow the UI language".
const DOC_LANGUAGE_KEY = "freelance-kit-doc-language";

function getDocLanguagePref() {
  try {
    const saved = localStorage.getItem(DOC_LANGUAGE_KEY);
    return saved === "en" || saved === "id" ? saved : "app";
  } catch (err) {
    return "app";
  }
}

function getDocLanguage() {
  const pref = getDocLanguagePref();
  return pref === "app" ? getAppLanguage() : pref;
}

function setDocLanguagePref(pref) {
  const normalized = pref === "en" || pref === "id" ? pref : "app";
  try {
    if (normalized === "app") localStorage.removeItem(DOC_LANGUAGE_KEY);
    else localStorage.setItem(DOC_LANGUAGE_KEY, normalized);
  } catch (err) { /* ignore */ }
  // Unlike the UI language (which needs a full reload to re-render
  // every data-i18n element), document previews already re-render on
  // every keystroke — this event just asks whichever generator is
  // currently open to redraw its preview with the new language, live,
  // with no reload.
  window.dispatchEvent(new Event("freelance-doc-language-changed"));
  return normalized;
}

// Applied immediately (not deferred to DOMContentLoaded) so the <html
// lang> attribute is correct from the very first paint, same timing
// as the theme's data-theme attribute.
document.documentElement.lang = getAppLanguage();

const TRANSLATIONS = {
  en: {
    // ---- Sidebar ----
    "brand.subtitle": "Pricing & Proposal Toolkit",
    "sidebar.group.overview": "Overview",
    "sidebar.group.calculators": "Calculators",
    "sidebar.group.generate": "Generate",
    "sidebar.group.manage": "Manage",
    "sidebar.group.settings": "Settings",
    "nav.dashboard": "Dashboard",
    "nav.pricingCalculator": "Pricing Calculator",
    "nav.revisionCalculator": "Revision Calculator",
    "nav.quotationGenerator": "Quotation Generator",
    "nav.proposalGenerator": "Proposal Generator",
    "nav.invoiceGenerator": "Invoice Generator",
    "nav.rateCardGenerator": "Rate Card Generator",
    "nav.myProjects": "My Projects",
    "nav.myQuotations": "My Quotations",
    "nav.myProposals": "My Proposals",
    "nav.myInvoices": "My Invoices",
    "nav.myRateCards": "My Rate Cards",
    "nav.templates": "Templates",
    "nav.help": "Help",
    "nav.settings": "Settings",
    "sidebar.appearance.label": "Appearance",
    "sidebar.appearance.light": "Light",
    "sidebar.appearance.dark": "Dark",
    "profile.role": "Freelancer",
    "profile.hiPrefix": "Hi, {{name}}",

    // ---- Topbar ----
    "topbar.newProject": "New Project",
    "topbar.newQuotation": "New Quotation",
    "topbar.newProposal": "New Proposal",
    "topbar.newInvoice": "New Invoice",
    "topbar.newRateCard": "New Rate Card",
    "topbar.newTemplate": "New Template",
    "profile.menu.settings": "Account Settings",
    "profile.menu.help": "Help",

    // ---- Common actions (reused across generators/list pages) ----
    "action.save": "Save",
    "action.reset": "Reset",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.edit": "Edit",
    "action.duplicate": "Duplicate",
    "action.open": "Open",
    "action.exportPdf": "Export PDF",
    "action.backupNow": "Backup Now",
    "action.createNewBackup": "Create New Backup",
    "action.downloadBackup": "Download Backup",
    "action.close": "Close",
    "action.confirm": "Confirm",
    "action.back": "Back",
    "action.editPricing": "Edit Pricing",
    "action.useInQuotation": "Use in Quotation",
    "action.useInInvoice": "Use in Invoice",
    "placeholder.buildingPage": "The \"{{title}}\" page will be built in a future development session.",
    "validation.logoTooLarge": "Logo is too large (max 1.5MB). Choose a smaller image.",
    "validation.imageTooLarge": "Image is too large (max 1.5MB). Choose a smaller image.",

    // ---- Backup & Restore ----
    "backup.lastCreated": "Last backup created: {{date}}",
    "backup.lastCreated.never": "Last backup created: Never",
    "backup.downloaded.title": "Backup downloaded successfully",
    "backup.downloaded.detail": "Your backup file was downloaded. Store it somewhere safe so you can restore your data later.",
    "backup.error.invalidFile.title": "Invalid backup file",
    "backup.error.invalidFile.detail": "This file could not be read as a valid backup.",
    "backup.error.unsupportedVersion.title": "Unsupported backup version",
    "backup.error.unsupportedVersion.detail": "This backup was created with a newer version of the application.",
    "backup.error.invalid.title": "Invalid backup",
    "backup.error.invalid.detail": "This backup does not belong to this application.",
    "backup.preview.title": "This backup contains",
    "backup.preview.meta": "Backup date: {{date}}",
    "backup.preview.metaWithVersion": "Backup date: {{date}} \u00b7 App version {{version}}",
    "backup.section.projects": "Projects",
    "backup.section.quotations": "Quotations",
    "backup.section.proposals": "Proposals",
    "backup.section.invoices": "Invoices",
    "backup.section.rateCards": "Rate Cards",
    "backup.section.templates": "Templates",
    "backup.restoreData": "Restore Data",
    "backup.chooseDifferentFile": "Choose a Different File",
    "backup.restoreFailed.title": "Restore failed \u2014 your data was not changed",
    "backup.restoreFailed.detail": "Your browser's storage may be full or unavailable. Free up space and try again.",
    "backup.restoredSuccessfully": "Data restored successfully",
    "backup.allDataDeleted": "All data deleted",
    "backup.clearFailed.title": "Some data could not be cleared",
    "backup.clearFailed.detail": "Your browser's storage may be restricted. You can try again from Settings.",

    // ---- Backup Reminder (Dashboard banner) ----
    "backup.reminder.protectTitle": "Protect Your Data",
    "backup.reminder.protectText": "Your data is stored locally in this browser. Create a backup to help protect your saved work.",
    "backup.reminder.backUpNow": "Back Up Now",
    "backup.reminder.remindLater": "Remind Me Later",
    "backup.reminder.outdatedTitle": "Your Backup May Be Outdated",
    "backup.reminder.outdatedText": "You have made changes since your last backup. Last backup created: {{date}}",
    "backup.reminder.recentTitle": "Last backup created: {{date}}",

    // ---- Cross-device Sync (Settings, optional) ----
    "sync.title": "Sync Across Devices (Optional)",
    "sync.text": "Off by default — your data stays only on this device. Turn this on to keep the same data in sync on your phone, tablet and computer.",
    "sync.enable": "Enable Sync",
    "sync.disable": "Turn Off Sync",
    "sync.loading": "Connecting…",
    "sync.statusOn": "Sync is on · signed in as {{email}}",
    "sync.emailLabel": "Email",
    "sync.passwordLabel": "Password",
    "sync.passwordHelp": "Use the same email & password on every device you want to sync.",
    "sync.submit": "Continue",
    "sync.cancel": "Cancel",
    "sync.modalTitle": "Sync Across Devices",
    "sync.modalText": "Sign in (or create an account) with an email and password. Use the same one on every device.",
    "sync.error.generic": "Could not connect. Check your email/password and try again.",
    "sync.error.weakPassword": "Password must be at least 6 characters.",
    "sync.error.invalidEmail": "That email address doesn't look right.",
    "sync.conflictTitle": "Existing Cloud Data Found",
    "sync.conflictText": "This account already has synced data from another device. Which data should be kept?",
    "sync.keepCloud": "Use Cloud Data (replace this device's data)",
    "sync.keepLocal": "Use This Device's Data (replace cloud data)",
    "sync.enabledToast": "Sync turned on — your data will now stay in sync across devices",
    "sync.disabledToast": "Sync turned off — this device now keeps its data locally only",
    "sync.pulledToast": "Data updated from another device",
    "sync.conflictThisDevice": "This device:",
    "sync.conflictCloud": "Cloud (other device):",
    "sync.conflictEmpty": "No data",
    "sync.section.businessProfile": "business profile",
    "sync.section.projects": "project(s)",
    "sync.section.quotations": "quotation(s)",
    "sync.section.proposals": "proposal(s)",
    "sync.section.invoices": "invoice(s)",
    "sync.section.rateCards": "rate card(s)",
    "sync.section.templates": "template(s)",

    // ---- Save status indicator (Quotation/Proposal/Invoice/Settings) ----
    "saveStatus.unsaved": "\u25cf Unsaved changes",
    "saveStatus.saved": "\u2713 Saved",
    "saveStatus.changesSaved": "\u2713 Changes saved",

    // ---- Business Profile (Settings) ----
    "profile.saveError": "Could not save \u2014 your browser's storage may be full or unavailable. Try again.",
    "profile.saveErrorToast.title": "Could not save business profile",
    "profile.saveErrorToast.detail": "Your browser's storage may be full or unavailable. Try again.",
    "profile.saved": "Saved! This business profile will automatically be used on new documents.",
    "profile.savedToast": "Business profile saved successfully",

    // ---- Templates ----
    "template.saveError.title": "Could not save this template",
    "template.saveError.detail": "Your browser's storage may be full or unavailable. Try again.",
    "template.fallbackCreated": "Saved as a new template \u2014 the one you were editing could not be found",
    "template.savedSuccessfully": "Template \"{{name}}\" saved successfully",
    "template.itemsAdded": "Items from \"{{name}}\" added",
    "template.duplicateError.title": "Could not duplicate this template",
    "template.duplicateError.detail": "Your browser's storage may be full or unavailable. Try again.",
    "template.duplicatedAs": "Template duplicated as \"{{name}}\"",

    // ---- Delete confirmation dialogs ----
    "delete.project.title": "Delete project?",
    "delete.project.text": "This project will be permanently removed. This action cannot be undone.",
    "delete.project.button": "Delete Project",
    "delete.quotation.title": "Delete quotation?",
    "delete.quotation.text": "This quotation will be permanently removed. This action cannot be undone.",
    "delete.quotation.button": "Delete Quotation",
    "delete.proposal.title": "Delete proposal?",
    "delete.proposal.text": "This proposal will be permanently removed. This action cannot be undone.",
    "delete.proposal.button": "Delete Proposal",
    "delete.invoice.title": "Delete invoice?",
    "delete.invoice.text": "This invoice will be permanently removed. This action cannot be undone.",
    "delete.invoice.button": "Delete Invoice",
    "delete.businessProfile.title": "Reset all business information?",
    "delete.businessProfile.text": "This clears your saved business profile. Projects, quotations, proposals, and invoices are not affected.",
    "delete.businessProfile.button": "Reset",
    "delete.rateCard.title": "Delete rate card?",
    "delete.rateCard.text": "This rate card and its saved services will be permanently removed. This action cannot be undone.",
    "delete.rateCard.button": "Delete Rate Card",
    "delete.template.title": "Delete this template?",
    "delete.template.text": "This template will be permanently removed. Quotations and invoices already using its items are not affected.",
    "delete.template.button": "Delete Template",
    "delete.nothingDeleted": "Nothing was deleted \u2014 that item may already be gone",
    "delete.success.project": "Project deleted successfully",
    "delete.success.quotation": "Quotation deleted successfully",
    "delete.success.proposal": "Proposal deleted successfully",
    "delete.success.invoice": "Invoice deleted successfully",
    "delete.success.rateCard": "Rate card deleted successfully",
    "delete.success.template": "Template deleted successfully",

    // ---- Restore / Clear All Data modals ----
    "modal.restoreTitle": "Restore backup?",
    "modal.restoreText1": "Your current data will be replaced by the data in this backup.",
    "modal.backupDateLabel": "Backup date:",
    "modal.restoreText2": "Current data will be overwritten.",
    "modal.clearAllTitle": "Delete all app data?",
    "modal.clearAllText1": "This will permanently remove all saved projects, documents, rate cards, templates and settings from this browser.",
    "modal.clearAllText2": "This cannot be undone unless you have a backup.",
    "modal.typeDeleteToConfirm": "Type DELETE to confirm",
    "modal.deleteEverything": "Delete Everything",

    // ---- Pricing Calculator: save feedback ----
    "calc.updated": "Updated! Changes to \"{{name}}\" have been saved.",
    "calc.savedAsNew": "Saved as a new project \u2014 the one you were editing could not be found. \"{{name}}\" now appears in Recent Projects.",
    "calc.saveError.notFound": "Could not save \u2014 the project you were editing could not be found, and your browser's storage may be full or unavailable. Try again.",
    "calc.saveError.generic": "Could not save your changes \u2014 your browser's storage may be full or unavailable. Try again.",
    "calc.saved": "Saved! \"{{name}}\" now appears in Recent Projects on the Dashboard.",
    "calc.saveError.create": "Could not save this project \u2014 your browser's storage may be full or unavailable. Try again.",
    "calc.updateProjectBtn": "Update Project",
    "calc.saveToProjectBtn": "Save to Project",
    "calc.health.lowMargin.label": "Low Margin",
    "calc.health.lowMargin.note": "Profit margin is under 15% \u2014 consider raising your price or lowering costs.",
    "calc.health.highRisk.label": "High Risk",
    "calc.health.highRisk.note": "Risk buffer is above 30% \u2014 make sure the project scope is genuinely uncertain.",
    "calc.health.healthy.label": "Healthy",
    "calc.health.healthy.note": "Your margin and risk buffer are in a healthy range.",
    "calc.health.neutral.note": "Fill in project details to see the pricing health status.",
    "calc.profitAnalysis.title": "Profit Analysis",
    "calc.pricingHealth.title": "Pricing Health",
    "calc.estimatedProfit": "Estimated Profit",
    "calc.profitMargin": "Profit Margin",
    "calc.hourlyEarnings": "Hourly Earnings",
    "calc.field.projectName": "Project Name",
    "calc.field.serviceType": "Service Type",
    "calc.field.estimatedHours": "Estimated Working Hours",
    "calc.field.hourlyRate": "Hourly Rate",
    "calc.field.additionalExpenses": "Additional Expenses",
    "calc.field.includedRevisions": "Included Revisions",
    "calc.field.revisionFee": "Fee Per Additional Revision",
    "calc.field.expectedRevisions": "Expected Additional Revisions",
    "calc.field.riskBuffer": "Risk / Project Buffer",
    "calc.field.targetMargin": "Target Profit Margin",
    "search.projects": "Search projects...",
    "search.quotations": "Search quotations...",
    "search.proposals": "Search proposals...",
    "search.invoices": "Search invoices...",
    "search.rateCards": "Search rate cards or services...",
    "search.templates": "Search templates...",
    "placeholder.proposalOverview": "Briefly describe the project, its purpose, and the expected outcome.",
    "placeholder.invoicePaymentInstructions": "Please make payment to the account above and send proof of payment after completing the transfer.",
    "placeholder.settingsPaymentInstructions": "Please transfer to the account above and send payment confirmation.",
    "placeholder.rateCardNotes": "Prices may vary depending on project complexity.",
    "section.projectInformation": "Project Information",
    "section.quotationDetails": "Quotation Details",
    "section.clientInformation": "Client Information",
    "section.businessInformation": "Business Information",
    "section.quotationItems": "Quotation Items",
    "section.discountTax": "Discount & Tax",
    "section.paymentTerms": "Payment Terms",
    "section.notesTerms": "Notes & Terms",
    "section.summary": "Summary",
    "section.proposalDetails": "Proposal Details",
    "section.projectOverview": "Project Overview",
    "section.proposalContent": "Proposal Content",
    "section.investment": "Investment",
    "section.invoiceDetails": "Invoice Details",
    "section.billToClientInformation": "Bill To / Client Information",
    "section.yourBusiness": "Your Business",
    "section.invoiceItems": "Invoice Items",
    "section.paymentInformation": "Payment Information",
    "section.notes": "Notes",
    "section.businessIdentity": "Business Identity",
    "section.documentPreferences": "Document Preferences",
    "section.dataBackup": "Data & Backup",
    "section.dangerZone": "Danger Zone",
    "section.businessProfile": "Business Profile",
    "section.rateCardInformation": "Rate Card Information",
    "section.services": "Services",
    "action.addItem": "+ Add Item",
    "action.addService": "+ Add Service",
    "action.saveQuotation": "Save Quotation",
    "action.saveProposal": "Save Proposal",
    "action.saveInvoice": "Save Invoice",
    "action.saveRateCard": "Save Rate Card",
    "action.saveTemplate": "Save Template",
    "action.calculateFirstProject": "Calculate My First Project",
    "action.loadSampleData": "Load Sample Data",
    "action.viewAll": "View All",
    "action.calculatePrice": "Calculate Price",
    "action.useLatestProfile": "Use latest Business Profile",
    "action.remove": "Remove",
    "action.resetProfile": "Reset Profile",
    "action.saveChanges": "Save Changes",
    "action.backToDashboard": "Back to Dashboard",
    "placeholder.comingSoon": "Coming soon",
    "dashboard.summary.noProjectsYet": "No projects yet",
    "dashboard.summary.fromApprovedCompleted": "From Approved & Completed projects",
    "dashboard.summary.waitingForClientResponse": "Waiting for client response",
    "dashboard.summary.approvedProjects": "Approved projects",
    "dashboard.summary.totalProject.one": "{{n}} total project",
    "dashboard.summary.totalProject.other": "{{n}} total projects",
    "needsAttention.quotations.one": "{{n}} Quotation",
    "needsAttention.quotations.other": "{{n}} Quotations",
    "needsAttention.waitingForResponse": "Waiting for response",
    "needsAttention.proposals.one": "{{n}} Proposal",
    "needsAttention.proposals.other": "{{n}} Proposals",
    "needsAttention.pendingApproval": "Pending approval",
    "needsAttention.invoices.one": "{{n}} Invoice",
    "needsAttention.invoices.other": "{{n}} Invoices",
    "needsAttention.paymentOutstanding": "Payment outstanding",
    "quickAction.calculatePrice.title": "Calculate Project Price",
    "quickAction.calculatePrice.desc": "Start a new calculation",
    "quickAction.createQuotation.title": "Create Quotation",
    "quickAction.createQuotation.desc": "Send to client",
    "quickAction.createProposal.title": "Create Proposal",
    "quickAction.createProposal.desc": "Win more projects",
    "quickAction.createInvoice.title": "Create Invoice",
    "quickAction.createInvoice.desc": "Request payment",
    "proposal.accordion.objectives.count.one": "{{n}} objective",
    "proposal.accordion.objectives.count.other": "{{n}} objectives",
    "proposal.accordion.objectives.empty": "No objectives yet",
    "proposal.accordion.scope.count.one": "{{n}} item",
    "proposal.accordion.scope.count.other": "{{n}} items",
    "proposal.accordion.scope.empty": "No items yet",
    "proposal.accordion.deliverables.count.one": "{{n}} deliverable",
    "proposal.accordion.deliverables.count.other": "{{n}} deliverables",
    "proposal.accordion.deliverables.empty": "No deliverables yet",
    "proposal.accordion.timeline.count.one": "{{n}} phase",
    "proposal.accordion.timeline.count.other": "{{n}} phases",
    "proposal.accordion.timeline.empty": "No phases yet",
    "proposal.accordion.filledIn": "Filled in",
    "proposal.accordion.notFilledIn": "Not filled in yet",
    "proposal.paymentTerms.5050": "50% deposit before project starts\n50% upon final delivery",
    "proposal.paymentTerms.100upfront": "100% payment upfront before project starts",
    "proposal.paymentTerms.3070": "30% deposit before project starts\n70% upon final delivery",
    "proposal.accordion.objectivesTitle": "Objectives",
    "proposal.accordion.scopeTitle": "Scope of Work",
    "proposal.accordion.deliverablesTitle": "Deliverables",
    "proposal.accordion.timelineTitle": "Timeline",
    "proposal.accordion.investmentTitle": "Investment",
    "proposal.accordion.paymentTermsTitle": "Payment Terms",
    "proposal.accordion.nextStepsTitle": "Next Steps",
    "settings.contactInformation": "Contact Information",
    "backup.yourDataTitle": "Backup Your Data",
    "backup.restoreFromBackupTitle": "Restore from Backup",
    "settings.resetBusinessProfileTitle": "Reset Business Profile",
    "settings.clearAllDataTitle": "Clear All Data",
    "field.items": "Items",
    "modal.projectDetail": "Project Detail",
    "field.subtotal": "Subtotal",
    "field.total": "Total",
    "settings.dataStoredLocally": "Your data is stored locally in your browser.",
    "calc.breakdown.workingHours": "Working Hours",
    "calc.breakdown.hoursValue": "{{hours}} hours",
    "calc.breakdown.laborCost": "Labor Cost",
    "calc.breakdown.additionalExpenses": "Additional Expenses",
    "calc.breakdown.additionalRevision": "Additional Revision",
    "calc.breakdown.baseCost": "Base Cost",
    "calc.breakdown.riskBuffer": "Risk Buffer ({{percent}}%)",
    "calc.breakdown.totalProjectCost": "Total Project Cost",
    "calc.breakdown.profit": "Profit",
    "calc.recommendedPrice": "Your Recommended Price",
    "calc.revisionTotal": "Total Revision Cost",
    "revc.sectionTitle": "Revision Details",
    "revc.subtitle": "Quickly calculate the cost of extra revisions requested by a client.",
    "revc.projectLabel": "Take from Project (optional)",
    "revc.manualOption": "Manual",
    "revc.feeLabel": "Fee per Additional Revision",
    "revc.qtyLabel": "Number of Additional Revisions",
    "revc.breakdown.revisionsTimesFee": "{{qty}} revisions \u00d7 {{fee}}",

    // ---- Quotation/Proposal/Invoice/Rate Card save feedback ----
    "quotation.updated": "Updated! {{number}} has been saved.",
    "quotation.savedAsNew": "Saved as a new quotation \u2014 the one you were editing could not be found. {{number}} now appears in My Quotations.",
    "quotation.saveError.notFound": "Could not save \u2014 the quotation you were editing could not be found, and your browser's storage may be full or unavailable. Try again.",
    "quotation.saveError.generic": "Could not save your changes \u2014 your browser's storage may be full or unavailable. Try again.",
    "quotation.saved": "Saved! {{number}} is ready to download or reopen anytime.",
    "quotation.saveError.create": "Could not save this quotation \u2014 your browser's storage may be full or unavailable. Try again.",

    "proposal.updated": "Updated! {{number}} has been saved.",
    "proposal.savedAsNew": "Saved as a new proposal \u2014 the one you were editing could not be found. {{number}} now appears in My Proposals.",
    "proposal.saveError.notFound": "Could not save \u2014 the proposal you were editing could not be found, and your browser's storage may be full or unavailable. Try again.",
    "proposal.saveError.generic": "Could not save your changes \u2014 your browser's storage may be full or unavailable. Try again.",
    "proposal.saved": "Saved! {{number}} is ready to download or reopen anytime.",
    "proposal.saveError.create": "Could not save this proposal \u2014 your browser's storage may be full or unavailable. Try again.",

    "invoice.updated": "Updated! {{number}} has been saved.",
    "invoice.savedAsNew": "Saved as a new invoice \u2014 the one you were editing could not be found. {{number}} now appears in My Invoices.",
    "invoice.saveError.notFound": "Could not save \u2014 the invoice you were editing could not be found, and your browser's storage may be full or unavailable. Try again.",
    "invoice.saveError.generic": "Could not save your changes \u2014 your browser's storage may be full or unavailable. Try again.",
    "invoice.saved": "Saved! {{number}} is ready to download or reopen anytime.",
    "invoice.saveError.create": "Could not save this invoice \u2014 your browser's storage may be full or unavailable. Try again.",

    "rateCard.updated": "Updated! \"{{title}}\" has been saved.",
    "rateCard.savedAsNew": "Saved as a new rate card \u2014 the one you were editing could not be found. \"{{title}}\" now appears in My Rate Cards.",
    "rateCard.saveError.notFound": "Could not save \u2014 the rate card you were editing could not be found, and your browser's storage may be full or unavailable. Try again.",
    "rateCard.saveError.generic": "Could not save your changes \u2014 your browser's storage may be full or unavailable. Try again.",
    "rateCard.saved": "Saved! \"{{title}}\" is ready to download or reopen anytime.",
    "rateCard.saveError.create": "Could not save this rate card \u2014 your browser's storage may be full or unavailable. Try again.",

    // ---- Deadline labels (Dashboard Upcoming panel) ----
    "deadline.overdueBy.one": "Overdue by {{n}} day",
    "deadline.overdueBy.other": "Overdue by {{n}} days",
    "deadline.dueToday": "Due today",
    "deadline.dueTomorrow": "Due tomorrow",
    "deadline.dueInDays": "Due in {{n}} days",

    // ---- Project Detail: empty document sections ----
    "detail.noQuotationYet": "No quotation yet",
    "detail.noProposalsYet": "No proposals yet",
    "detail.noInvoicesYet": "No invoices yet",
    "detail.createQuotation": "Create Quotation",
    "detail.newQuotation": "+ New Quotation",
    "detail.createProposal": "Create Proposal",
    "detail.newProposal": "+ New Proposal",
    "detail.createInvoice": "Create Invoice",
    "detail.newInvoice": "+ New Invoice",
    "logo.noLogo": "No logo",
    "template.createTitle": "Create Template",
    "template.editingTitle": "Editing \"{{name}}\"",
    "quotation.defaultNotes": "Thank you for your consideration.",
    "invoice.defaultNotes": "Thank you for your business.",
    "rateCard.defaultNotes": "Prices may vary depending on project complexity.",
    "rateCard.defaultTitle": "{{year}} Service Rates",
    "proposal.defaultTitle": "Project Proposal",

    // ---- Shared field labels (used across multiple generators) ----
    "field.projectName": "Project Name",
    "field.serviceType": "Service Type",
    "field.estimatedWorkingHours": "Estimated Working Hours",
    "field.hourlyRate": "Hourly Rate",
    "field.additionalExpenses": "Additional Expenses",
    "field.includedRevisions": "Included Revisions",
    "field.feePerAdditionalRevision": "Fee Per Additional Revision",
    "field.expectedAdditionalRevisions": "Expected Additional Revisions",
    "field.riskBuffer": "Risk / Project Buffer",
    "field.targetProfitMargin": "Target Profit Margin",
    "field.date": "Date",
    "field.validUntil": "Valid Until",
    "field.validUntilOptional": "Valid Until (optional)",
    "field.validFrom": "Valid From",
    "field.project": "Project",
    "field.clientName": "Client Name",
    "field.company": "Company",
    "field.email": "Email",
    "field.phone": "Phone",
    "field.phoneWhatsapp": "Phone / WhatsApp",
    "field.address": "Address",
    "field.logo": "Logo",
    "field.businessName": "Business Name",
    "field.website": "Website",
    "field.loadFromTemplate": "Load from Template",
    "field.discount": "Discount",
    "field.discountValue": "Discount Value",
    "field.tax": "Tax",
    "field.terms": "Terms",
    "field.customPaymentTerms": "Custom Payment Terms",
    "field.notes": "Notes",
    "field.termsConditions": "Terms & Conditions",
    "field.quotationNumber": "Quotation Number",
    "field.invoiceNumber": "Invoice Number",
    "field.proposalNumber": "Proposal Number",
    "field.proposalTitle": "Proposal Title",
    "field.projectInvestment": "Project Investment",
    "field.issueDate": "Issue Date",
    "field.dueDate": "Due Date",
    "field.status": "Status",
    "field.paymentMethod": "Payment Method",
    "field.bankName": "Bank Name",
    "field.accountName": "Account Name",
    "field.accountNumber": "Account Number",
    "field.paymentInstructions": "Payment Instructions",
    "field.rateCardTitle": "Rate Card Title",
    "field.templateName": "Template Name",

    // ---- Settings-specific labels ----
    "settings.businessLogo": "Business Logo",
    "settings.businessTagline": "Business Tagline",
    "settings.ownerName": "Owner Name",
    "settings.businessNameRequired": "Business Name *",
    "settings.emailRequired": "Email *",
    "settings.phoneWhatsappRequired": "Phone / WhatsApp *",
    "settings.instagram": "Instagram",
    "settings.city": "City",
    "settings.country": "Country",
    "settings.qrisImage": "QRIS Image",
    "settings.defaultTax": "Default Tax",
    "settings.defaultValidUntil": "Default Valid Until",
    "settings.defaultPaymentTerms": "Default Payment Terms",
    "settings.currency": "Currency",
    "calc.expensesHelp": "Software, stock photo, transport, plugin, outsourcing, and other additional costs.",
    "calc.riskBufferHelp": "Buffer for scope changes, extra meetings, and project risk.",
    "backup.downloadHelp": "Backups are downloaded as files. Keep your backup file somewhere safe.",
    "field.noSavedProjects": "No saved projects.",
    "field.createAProject": "Create a project",
    "quotation.orFillManually": "or fill this quotation manually.",
    "proposal.orFillManually": "or fill this proposal manually.",
    "invoice.orFillManually": "or fill this invoice manually.",
    "section.paymentInfoOptionalNote": "All fields below are optional \u2014 leave blank if not relevant.",
    "section.documentPrefsSubtitle": "Default values applied to new Quotations, Proposals, and Invoices.",
    "placeholder.calcName": "Website Company Profile",
    "placeholder.propTitle": "Project Proposal",
    "placeholder.rateTitle": "2026 Service Rates",
    "placeholder.tplName": "Website Package",

    // ---- Help & Support: chrome ----
    "help.backToHelp": "Back to Help",
    "help.relatedArticles": "Related Articles",
    "help.gettingStarted": "Getting Started",
    "help.allFeatureGuides": "All Feature Guides",
    "help.faq": "FAQ",
    "help.dataAndTroubleshooting": "Data & Troubleshooting",
    "help.category.troubleshooting": "Troubleshooting",
    "help.dataStored.title": "Where is my data stored?",
    "help.dataStored.text": "Everything you create is saved in this browser's local storage \u2014 not on a server, and not in the cloud. Data does not automatically sync between devices, clearing your browser's data may remove your saved app data, and using a different browser or device will not automatically show the same data. You should create backups regularly \u2014 see \"Backup & Restore Your Data\" above.",
    "help.noResultsFor": "No results for \u201c{{query}}\u201d. Try a different word, or browse the guides below.",
    "help.resultsFor.one": "{{n}} result for \u201c{{query}}\u201d",
    "help.resultsFor.other": "{{n}} results for \u201c{{query}}\u201d",
    "help.searchPlaceholder": "Search for help...",

    // ---- Dashboard ----
    "dashboard.greeting": "Good morning, {{name}}",
    "dashboard.greeting.defaultName": "Freelancer",
    "dashboard.subtitle": "Here's what's happening with your freelance business.",
    "dashboard.productiveMsg": "Have a productive day!",
    "dashboard.welcome.title": "Your freelance workspace is ready.",
    "dashboard.summary.totalProjects": "Total Projects",
    "dashboard.summary.totalRevenue": "Total Revenue",
    "dashboard.summary.pendingProposals": "Pending Proposals",
    "dashboard.summary.approved": "Approved",
    "dashboard.backupData.title": "Backup Data",
    "dashboard.backupData.recommended": "Backup recommended",
    "dashboard.backupData.neverBackedUp": "Your data has not been backed up yet.",
    "dashboard.backupData.changedSinceBackup": "Changes were made after your last backup.",
    "dashboard.backupData.oldBackup": "Your last backup is {{days}} days old.",
    "dashboard.backupData.lastBackup": "Last backup",
    "dashboard.backupData.today": "Today, {{time}}",
    "dashboard.backupData.yesterday": "Yesterday",
    "dashboard.backupData.daysAgo": "{{days}} days ago",
    "dashboard.backupData.upToDate": "Backup is up to date.",
    "dashboard.upcoming.title": "Upcoming",
    "dashboard.upcoming.empty": "No upcoming deadlines.",
    "dashboard.needsAttention.title": "Needs Attention",
    "dashboard.needsAttention.allCaughtUp": "You're all caught up.",
    "dashboard.quickActions.title": "Quick Actions",
    "dashboard.recentProjects.title": "Recent Projects",

    // ---- Settings: Appearance ----
    "settings.appearance.title": "Appearance",
    "settings.appearance.desc": "Choose how Freelance Kit looks on this device.",

    // ---- Settings: Language ----
    "settings.language.title": "Language",
    "settings.language.desc": "Choose the language used throughout the application interface.",
    "settings.language.english": "English",
    "settings.language.indonesian": "Bahasa Indonesia",
    "settings.docLanguage.title": "Document Language",
    "settings.docLanguage.desc": "Language used in generated Quotations, Proposals, Invoices, and Rate Cards — can be different from the app language above.",
    "settings.docLanguage.sameAsApp": "Same as App",
    "settings.docLanguage.english": "English",
    "settings.docLanguage.indonesian": "Bahasa Indonesia",

    // ---- Toasts / confirmations (common) ----
    "toast.savedSuccessfully": "Saved successfully",
    "toast.deletedSuccessfully": "Deleted successfully",
    "confirm.deleteTitle": "Delete this item?",
    "confirm.deleteText": "This action cannot be undone.",

    // ---- List page filters / sorting (common across list pages) ----
    "filter.allStatus": "All Status",
    "status.draft": "Draft",
    "status.sent": "Sent",
    "status.proposalSent": "Proposal Sent",
    "status.approved": "Approved",
    "status.rejected": "Rejected",
    "status.completed": "Completed",
    "status.accepted": "Accepted",
    "status.expired": "Expired",
    "status.paid": "Paid",
    "status.overdue": "Overdue",
    "sort.recentlyUpdated": "Sort: Recently Updated",
    "sort.oldestUpdated": "Sort: Oldest Updated",
    "sort.oldest": "Sort: Oldest",
    "sort.priceHighLow": "Sort: Price (High to Low)",
    "sort.priceLowHigh": "Sort: Price (Low to High)",
    "sort.totalHighLow": "Sort: Total (High to Low)",
    "sort.totalLowHigh": "Sort: Total (Low to High)",
    "sort.valueHighLow": "Sort: Value (High to Low)",
    "sort.valueLowHigh": "Sort: Value (Low to High)",
    "sort.highestValue": "Sort: Highest Value",
    "sort.lowestValue": "Sort: Lowest Value",
    "sort.nameAZ": "Sort: Name (A\u2013Z)",
    "sort.nameAZPlain": "Sort: Name A\u2013Z",

    // ---- Empty states (list pages) ----
    "emptyState.rateCards.title": "No rate cards yet",
    "emptyState.rateCards.text": "Create a reusable rate card to keep your services and pricing organized.",
    "emptyState.rateCards.cta": "+ Create Your First Rate Card",
    "emptyState.invoices.title": "No invoices yet",
    "emptyState.invoices.text": "Create your first professional invoice for your client.",
    "emptyState.invoices.cta": "+ Create Invoice",
    "emptyState.proposals.title": "No proposals yet",
    "emptyState.proposals.text": "Create your first professional proposal for your next client.",
    "emptyState.proposals.cta": "+ Create Proposal",
    "emptyState.quotations.title": "No quotations yet",
    "emptyState.quotations.text": "Create your first professional quotation for your client.",
    "emptyState.quotations.cta": "+ Create Quotation",
    "emptyState.templates.title": "No templates yet",
    "emptyState.templates.text": "Save your frequently used item sets and reuse them when creating documents.",
    "emptyState.templates.cta": "+ Create Your First Template",

    // ---- Backup & Danger Zone (Settings) ----
    "backup.yourDataText": "Download a copy of your saved data and keep it safe. You can use it to restore your data later or move it to another device.",
    "backup.restoreFromBackupText": "Restore your saved data from a previously exported backup file.",
    "backup.chooseFile": "Choose Backup File",
    "settings.dataStoredLocallyWarning": "Clearing browser data or changing devices may remove access to your saved data. We recommend downloading a backup regularly.",
    "settings.resetBusinessProfileText": "Clears all Business Profile fields above. Documents you've already saved are not affected.",
    "settings.clearAllDataText": "Permanently remove all saved projects, documents, rate cards, templates and settings from this browser. This cannot be undone unless you have a backup.",

    // ---- Default placeholder user (data.js) ----
    "user.defaultName": "Your Name",
    "user.defaultEmail": "you@example.com",

    // ---- My Projects: summary bar + table headers ----
    "myProjects.summary.totalProjects": "Total Projects",
    "myProjects.summary.totalEstimatedValue": "Total Estimated Value",
    "myProjects.summary.lastUpdated": "Last Updated",
    "myProjects.table.project": "Project",
    "myProjects.table.client": "Client",
    "myProjects.table.projectValue": "Project Value",
    "myProjects.table.status": "Status",
    "myProjects.table.lastUpdated": "Last Updated",
    "myProjects.table.actions": "Actions",

    // ---- Document preview (Invoice / Quotation / Proposal / Rate Card) ----
    "doc.yourBusinessName": "Your Business Name",
    "doc.clientNamePlaceholder": "Client Name",
    "doc.noItemsYet": "No items yet",
    "doc.date": "Date",
    "doc.due": "Due",
    "doc.billTo": "Bill To",
    "doc.project": "Project",
    "doc.description": "Description",
    "doc.qty": "Qty",
    "doc.price": "Price",
    "doc.total": "Total",
    "doc.subtotal": "Subtotal",
    "doc.tax": "Tax",
    "doc.grandTotal": "TOTAL",
    "doc.paymentInformation": "Payment Information",
    "doc.paymentTerms": "Payment Terms",
    "doc.notes": "Notes",
    "doc.invoiceTitle": "INVOICE",
    "doc.quotationTitle": "QUOTATION",
    "doc.proposalTitle": "PROPOSAL",
    "doc.dueOnReceipt": "Due on receipt",
    "doc.validUntil": "Valid Until",
    "doc.termsConditions": "Terms & Conditions",
    "doc.projectProposalKicker": "PROJECT PROPOSAL",
    "doc.projectTitlePlaceholder": "Your project title will appear here",
    "doc.proposalLabel": "Proposal",
    "doc.preparedFor": "Prepared For",
    "doc.introduction": "Introduction",
    "doc.objectives": "Objectives",
    "doc.scopeOfWork": "Scope of Work",
    "doc.deliverables": "Deliverables",
    "doc.timeline": "Timeline",
    "doc.phase": "Phase",
    "doc.investment": "Investment",
    "doc.nextSteps": "Next Steps",
    "doc.thankYou": "Thank you.",
    "doc.validFrom": "Valid from",
    "doc.to": "to",
    "doc.serviceRates": "Service Rates",
    "doc.service": "Service",
    "doc.noServicesYet": "No services yet",
    "doc.discount": "Discount",
    "doc.bank": "Bank",
    "doc.accountName": "Account Name",
    "doc.accountNumber": "Account Number",
    "doc.discount": "Discount",
    "doc.bank": "Bank",
    "doc.accountName": "Account Name",
    "doc.accountNumber": "Account Number",

    // ---- Dashboard: Business Profile prompt card ----
    "profileCard.title": "Business Profile",
    "profileCard.text": "Complete your business profile to speed up every quotation, proposal, and invoice.",
    "profileCard.cta": "Set Up Profile",

    // ---- Table headers (dashboard mini-table + list pages) ----
    "table.project": "Project",
    "table.client": "Client",
    "table.price": "Price",
    "table.status": "Status",
    "table.updated": "Updated",
    "table.actions": "Actions",
    "table.invoice": "Invoice",
    "table.total": "Total",
    "table.proposal": "Proposal",
    "table.value": "Value",
    "table.quotation": "Quotation",
    "table.rateCard": "Rate Card",
    "table.validFrom": "Valid From",
    "table.template": "Template",
    "table.totalValue": "Total Value",

    // ---- Proposal builder: add-item buttons & defaults ----
    "action.addObjective": "+ Add Objective",
    "action.addScope": "+ Add Scope",
    "action.addDeliverable": "+ Add Deliverable",
    "action.addPhase": "+ Add Phase",
    "prop.shortDescPlaceholder": "Short description (optional)",
    "prop.phaseDescPlaceholder": "Discovery & Planning",
    "prop.defaultPhase1": "Discovery & Planning",
    "prop.defaultPhase2": "Design & Development",
    "prop.defaultDuration3Days": "3 Days",
    "prop.defaultDuration10Days": "10 Days",
    "prop.defaultObjective": "Deliver a professional result that meets the project goals",
    "prop.defaultDeliverable": "Final deliverable as agreed in the scope of work",

    // ---- Proposal builder: hardcoded empty-list messages & placeholders ----
    "prop.emptyObjectives": "No objectives yet. Click \"+ Add Objective\".",
    "prop.emptyDeliverables": "No deliverables yet. Click \"+ Add Deliverable\".",
    "prop.emptyScope": "No items yet. Click \"+ Add Scope\".",
    "prop.emptyTimeline": "No phases yet. Click \"+ Add Phase\".",
    "prop.objectivePlaceholder": "Improve online presence",
    "prop.deliverablePlaceholder": "Homepage",
    "prop.defaultScope1": "UI/UX Design",
    "prop.defaultScope2": "Development",
    "prop.defaultNextSteps": "1. Review this proposal\n2. Confirm the project scope\n3. Make the initial payment\n4. Project work begins",
    "prop.defaultTerms": "Project scope and pricing are based on the requirements described in this proposal.",

    // ---- Payment terms dropdown (Invoice) ----
    "terms.dueOnReceipt": "Due on receipt",
    "terms.7days": "7 days",
    "terms.14days": "14 days",
    "terms.30days": "30 days",
    "terms.custom": "Custom",

    // ---- Payment split options (Quotation / Proposal / Settings default) ----
    "terms.split5050": "50% / 50%",
    "terms.split100Upfront": "100% Upfront",
    "terms.split3070": "30% / 70%",
    "terms.split5050Long": "50% upfront / 50% completion",
    "terms.split100UpfrontLong": "100% upfront",
    "terms.split3070Long": "30% upfront / 70% completion",
    "terms.netDueOnReceipt": "Due on receipt",
    "terms.net7days": "Net 7 days",
    "terms.net14days": "Net 14 days",
    "terms.net30days": "Net 30 days",

    // ---- Rate unit ----
    "unit.perHour": "/hour",

    // ---- Misc form chrome still missing ----
    "select.service": "Select service",
    "unit.hours": "hours",
    "discount.none": "None",
    "discount.percentage": "Percentage",
    "discount.fixedAmount": "Fixed Amount",
  },

  id: {
    // ---- Sidebar ----
    "brand.subtitle": "Alat Bantu Harga & Proposal",
    "sidebar.group.overview": "Ringkasan",
    "sidebar.group.calculators": "Kalkulator",
    "sidebar.group.generate": "Buat",
    "sidebar.group.manage": "Kelola",
    "sidebar.group.settings": "Pengaturan",
    "nav.dashboard": "Dashboard",
    "nav.pricingCalculator": "Kalkulator Harga",
    "nav.revisionCalculator": "Kalkulator Revisi",
    "nav.quotationGenerator": "Buat Penawaran",
    "nav.proposalGenerator": "Buat Proposal",
    "nav.invoiceGenerator": "Buat Invoice",
    "nav.rateCardGenerator": "Buat Daftar Harga",
    "nav.myProjects": "Proyek Saya",
    "nav.myQuotations": "Penawaran Saya",
    "nav.myProposals": "Proposal Saya",
    "nav.myInvoices": "Invoice Saya",
    "nav.myRateCards": "Daftar Harga Saya",
    "nav.templates": "Template",
    "nav.help": "Bantuan",
    "nav.settings": "Pengaturan",
    "sidebar.appearance.label": "Tampilan",
    "sidebar.appearance.light": "Terang",
    "sidebar.appearance.dark": "Gelap",
    "profile.role": "Freelancer",
    "profile.hiPrefix": "Hai, {{name}}",

    // ---- Topbar ----
    "topbar.newProject": "Proyek Baru",
    "topbar.newQuotation": "Penawaran Baru",
    "topbar.newProposal": "Proposal Baru",
    "topbar.newInvoice": "Invoice Baru",
    "topbar.newRateCard": "Daftar Harga Baru",
    "topbar.newTemplate": "Template Baru",
    "profile.menu.settings": "Pengaturan Akun",
    "profile.menu.help": "Bantuan",

    // ---- Common actions ----
    "action.save": "Simpan",
    "action.reset": "Atur Ulang",
    "action.cancel": "Batal",
    "action.delete": "Hapus",
    "action.edit": "Edit",
    "action.duplicate": "Duplikat",
    "action.open": "Buka",
    "action.exportPdf": "Ekspor PDF",
    "action.backupNow": "Cadangkan Sekarang",
    "action.createNewBackup": "Buat Cadangan Baru",
    "action.downloadBackup": "Unduh Cadangan",
    "action.close": "Tutup",
    "action.confirm": "Konfirmasi",
    "action.back": "Kembali",
    "action.editPricing": "Edit Harga",
    "action.addItem": "+ Tambah Item",
    "action.addService": "+ Tambah Layanan",
    "action.saveQuotation": "Simpan Penawaran",
    "action.saveProposal": "Simpan Proposal",
    "action.saveInvoice": "Simpan Invoice",
    "action.saveRateCard": "Simpan Daftar Harga",
    "action.saveTemplate": "Simpan Template",
    "action.calculateFirstProject": "Hitung Proyek Pertama Saya",
    "action.loadSampleData": "Muat Data Contoh",
    "action.viewAll": "Lihat Semua",
    "action.calculatePrice": "Hitung Harga",
    "action.useLatestProfile": "Gunakan Profil Bisnis Terbaru",
    "action.remove": "Hapus",
    "action.resetProfile": "Atur Ulang Profil",
    "action.saveChanges": "Simpan Perubahan",
    "action.backToDashboard": "Kembali ke Dashboard",
    "placeholder.comingSoon": "Segera hadir",
    "dashboard.summary.noProjectsYet": "Belum ada project",
    "dashboard.summary.fromApprovedCompleted": "Dari project Approved & Completed",
    "dashboard.summary.waitingForClientResponse": "Menunggu respons client",
    "dashboard.summary.approvedProjects": "Proyek disetujui",
    "dashboard.summary.totalProject.one": "{{n}} total proyek",
    "dashboard.summary.totalProject.other": "{{n}} total proyek",
    "needsAttention.quotations.one": "{{n}} Penawaran",
    "needsAttention.quotations.other": "{{n}} Penawaran",
    "needsAttention.waitingForResponse": "Menunggu respons",
    "needsAttention.proposals.one": "{{n}} Proposal",
    "needsAttention.proposals.other": "{{n}} Proposal",
    "needsAttention.pendingApproval": "Menunggu persetujuan",
    "needsAttention.invoices.one": "{{n}} Invoice",
    "needsAttention.invoices.other": "{{n}} Invoice",
    "needsAttention.paymentOutstanding": "Pembayaran tertunda",
    "quickAction.calculatePrice.title": "Hitung Harga Proyek",
    "quickAction.calculatePrice.desc": "Mulai perhitungan baru",
    "quickAction.createQuotation.title": "Buat Penawaran",
    "quickAction.createQuotation.desc": "Kirim ke klien",
    "quickAction.createProposal.title": "Buat Proposal",
    "quickAction.createProposal.desc": "Menangkan lebih banyak proyek",
    "quickAction.createInvoice.title": "Buat Invoice",
    "quickAction.createInvoice.desc": "Minta pembayaran",
    "proposal.accordion.objectives.count.one": "{{n}} objektif",
    "proposal.accordion.objectives.count.other": "{{n}} objektif",
    "proposal.accordion.objectives.empty": "Belum ada objektif",
    "proposal.accordion.scope.count.one": "{{n}} item",
    "proposal.accordion.scope.count.other": "{{n}} item",
    "proposal.accordion.scope.empty": "Belum ada item",
    "proposal.accordion.deliverables.count.one": "{{n}} hasil kerja",
    "proposal.accordion.deliverables.count.other": "{{n}} hasil kerja",
    "proposal.accordion.deliverables.empty": "Belum ada hasil kerja",
    "proposal.accordion.timeline.count.one": "{{n}} fase",
    "proposal.accordion.timeline.count.other": "{{n}} fase",
    "proposal.accordion.timeline.empty": "Belum ada fase",
    "proposal.accordion.filledIn": "Sudah diisi",
    "proposal.accordion.notFilledIn": "Belum diisi",
    "proposal.paymentTerms.5050": "Uang muka 50% sebelum proyek dimulai\n50% saat pengiriman akhir",
    "proposal.paymentTerms.100upfront": "Pembayaran 100% di muka sebelum proyek dimulai",
    "proposal.paymentTerms.3070": "Uang muka 30% sebelum proyek dimulai\n70% saat pengiriman akhir",
    "proposal.accordion.objectivesTitle": "Objektif",
    "proposal.accordion.scopeTitle": "Ruang Lingkup Pekerjaan",
    "proposal.accordion.deliverablesTitle": "Hasil Kerja",
    "proposal.accordion.timelineTitle": "Linimasa",
    "proposal.accordion.investmentTitle": "Investasi",
    "proposal.accordion.paymentTermsTitle": "Ketentuan Pembayaran",
    "proposal.accordion.nextStepsTitle": "Langkah Selanjutnya",
    "settings.contactInformation": "Informasi Kontak",
    "backup.yourDataTitle": "Cadangkan Data Anda",
    "backup.restoreFromBackupTitle": "Pulihkan dari Cadangan",
    "settings.resetBusinessProfileTitle": "Atur Ulang Profil Bisnis",
    "settings.clearAllDataTitle": "Hapus Semua Data",
    "field.items": "Item",
    "modal.projectDetail": "Detail Proyek",
    "field.subtotal": "Subtotal",
    "field.total": "Total",
    "settings.dataStoredLocally": "Data Anda disimpan secara lokal di browser ini.",
    "action.useInQuotation": "Gunakan di Penawaran",
    "action.useInInvoice": "Gunakan di Invoice",
    "placeholder.buildingPage": "Halaman \"{{title}}\" akan dibangun pada sesi pengembangan berikutnya.",
    "validation.logoTooLarge": "Logo terlalu besar (maks 1.5MB). Pilih gambar yang lebih kecil.",
    "validation.imageTooLarge": "Gambar terlalu besar (maks 1.5MB). Pilih gambar yang lebih kecil.",

    // ---- Backup & Restore ----
    "backup.lastCreated": "Cadangan terakhir dibuat: {{date}}",
    "backup.lastCreated.never": "Cadangan terakhir dibuat: Belum pernah",
    "backup.downloaded.title": "Cadangan berhasil diunduh",
    "backup.downloaded.detail": "File cadangan Anda telah diunduh. Simpan di tempat yang aman agar dapat dipulihkan nanti.",
    "backup.error.invalidFile.title": "File cadangan tidak valid",
    "backup.error.invalidFile.detail": "File ini tidak dapat dibaca sebagai cadangan yang valid.",
    "backup.error.unsupportedVersion.title": "Versi cadangan tidak didukung",
    "backup.error.unsupportedVersion.detail": "Cadangan ini dibuat dengan versi aplikasi yang lebih baru.",
    "backup.error.invalid.title": "Cadangan tidak valid",
    "backup.error.invalid.detail": "Cadangan ini bukan milik aplikasi ini.",
    "backup.preview.title": "Cadangan ini berisi",
    "backup.preview.meta": "Tanggal cadangan: {{date}}",
    "backup.preview.metaWithVersion": "Tanggal cadangan: {{date}} \u00b7 Versi aplikasi {{version}}",
    "backup.section.projects": "Proyek",
    "backup.section.quotations": "Penawaran",
    "backup.section.proposals": "Proposal",
    "backup.section.invoices": "Invoice",
    "backup.section.rateCards": "Daftar Harga",
    "backup.section.templates": "Template",
    "backup.restoreData": "Pulihkan Data",
    "backup.chooseDifferentFile": "Pilih File Lain",
    "backup.restoreFailed.title": "Pemulihan gagal \u2014 data Anda tidak berubah",
    "backup.restoreFailed.detail": "Penyimpanan browser Anda mungkin penuh atau tidak tersedia. Kosongkan ruang dan coba lagi.",
    "backup.restoredSuccessfully": "Data berhasil dipulihkan",
    "backup.allDataDeleted": "Semua data telah dihapus",
    "backup.clearFailed.title": "Sebagian data tidak dapat dihapus",
    "backup.clearFailed.detail": "Penyimpanan browser Anda mungkin dibatasi. Anda dapat mencoba lagi dari Pengaturan.",

    // ---- Backup Reminder (Dashboard banner) ----
    "backup.reminder.protectTitle": "Lindungi Data Anda",
    "backup.reminder.protectText": "Data Anda disimpan secara lokal di browser ini. Buat cadangan untuk membantu melindungi pekerjaan yang telah Anda simpan.",
    "backup.reminder.backUpNow": "Cadangkan Sekarang",
    "backup.reminder.remindLater": "Ingatkan Nanti",
    "backup.reminder.outdatedTitle": "Cadangan Anda Mungkin Sudah Usang",
    "backup.reminder.outdatedText": "Ada perubahan sejak cadangan terakhir Anda. Cadangan terakhir dibuat: {{date}}",
    "backup.reminder.recentTitle": "Cadangan terakhir dibuat: {{date}}",

    // ---- Sync Antar Device (Settings, opsional) ----
    "sync.title": "Sync Antar Device (Opsional)",
    "sync.text": "Mati secara default — data kamu tetap hanya di device ini. Nyalakan ini supaya data yang sama tersimpan di HP, tablet, dan komputer kamu.",
    "sync.enable": "Aktifkan Sync",
    "sync.disable": "Matikan Sync",
    "sync.loading": "Menghubungkan…",
    "sync.statusOn": "Sync aktif · masuk sebagai {{email}}",
    "sync.emailLabel": "Email",
    "sync.passwordLabel": "Password",
    "sync.passwordHelp": "Pakai email & password yang sama di setiap device yang mau disinkronkan.",
    "sync.submit": "Lanjut",
    "sync.cancel": "Batal",
    "sync.modalTitle": "Sync Antar Device",
    "sync.modalText": "Masuk (atau buat akun baru) dengan email dan password. Pakai yang sama di setiap device.",
    "sync.error.generic": "Gagal terhubung. Cek email/password kamu lalu coba lagi.",
    "sync.error.weakPassword": "Password minimal 6 karakter.",
    "sync.error.invalidEmail": "Format email itu sepertinya salah.",
    "sync.conflictTitle": "Data Cloud Sudah Ada",
    "sync.conflictText": "Akun ini sudah punya data tersinkron dari device lain. Data mana yang mau dipakai?",
    "sync.keepCloud": "Pakai Data Cloud (timpa data di device ini)",
    "sync.keepLocal": "Pakai Data Device Ini (timpa data cloud)",
    "sync.enabledToast": "Sync dinyalakan — data kamu sekarang akan tersinkron di semua device",
    "sync.disabledToast": "Sync dimatikan — device ini sekarang cuma nyimpen data lokal",
    "sync.pulledToast": "Data diperbarui dari device lain",
    "sync.conflictThisDevice": "Device ini:",
    "sync.conflictCloud": "Cloud (device lain):",
    "sync.conflictEmpty": "Belum ada data",
    "sync.section.businessProfile": "profil bisnis",
    "sync.section.projects": "project",
    "sync.section.quotations": "quotation",
    "sync.section.proposals": "proposal",
    "sync.section.invoices": "invoice",
    "sync.section.rateCards": "rate card",
    "sync.section.templates": "template",

    // ---- Save status indicator ----
    "saveStatus.unsaved": "\u25cf Perubahan belum disimpan",
    "saveStatus.saved": "\u2713 Tersimpan",
    "saveStatus.changesSaved": "\u2713 Perubahan tersimpan",

    // ---- Business Profile (Settings) ----
    "profile.saveError": "Gagal menyimpan \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "profile.saveErrorToast.title": "Gagal menyimpan profil bisnis",
    "profile.saveErrorToast.detail": "Penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "profile.saved": "Tersimpan! Profil bisnis ini akan otomatis dipakai di dokumen baru.",
    "profile.savedToast": "Profil bisnis berhasil disimpan",

    // ---- Templates ----
    "template.saveError.title": "Gagal menyimpan template ini",
    "template.saveError.detail": "Penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "template.fallbackCreated": "Disimpan sebagai template baru \u2014 template yang Anda edit tidak dapat ditemukan",
    "template.savedSuccessfully": "Template \"{{name}}\" berhasil disimpan",
    "template.itemsAdded": "Item dari \"{{name}}\" ditambahkan",
    "template.duplicateError.title": "Gagal menduplikasi template ini",
    "template.duplicateError.detail": "Penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "template.duplicatedAs": "Template diduplikasi sebagai \"{{name}}\"",

    // ---- Delete confirmation dialogs ----
    "delete.project.title": "Hapus proyek?",
    "delete.project.text": "Proyek ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    "delete.project.button": "Hapus Proyek",
    "delete.quotation.title": "Hapus penawaran?",
    "delete.quotation.text": "Penawaran ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    "delete.quotation.button": "Hapus Penawaran",
    "delete.proposal.title": "Hapus proposal?",
    "delete.proposal.text": "Proposal ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    "delete.proposal.button": "Hapus Proposal",
    "delete.invoice.title": "Hapus invoice?",
    "delete.invoice.text": "Invoice ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    "delete.invoice.button": "Hapus Invoice",
    "delete.businessProfile.title": "Atur ulang semua informasi bisnis?",
    "delete.businessProfile.text": "Ini akan menghapus profil bisnis yang tersimpan. Proyek, penawaran, proposal, dan invoice tidak terpengaruh.",
    "delete.businessProfile.button": "Atur Ulang",
    "delete.rateCard.title": "Hapus daftar harga?",
    "delete.rateCard.text": "Daftar harga ini beserta layanan yang tersimpan akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    "delete.rateCard.button": "Hapus Daftar Harga",
    "delete.template.title": "Hapus template ini?",
    "delete.template.text": "Template ini akan dihapus secara permanen. Penawaran dan invoice yang sudah menggunakan itemnya tidak terpengaruh.",
    "delete.template.button": "Hapus Template",
    "delete.nothingDeleted": "Tidak ada yang dihapus \u2014 item tersebut mungkin sudah tidak ada",
    "delete.success.project": "Proyek berhasil dihapus",
    "delete.success.quotation": "Penawaran berhasil dihapus",
    "delete.success.proposal": "Proposal berhasil dihapus",
    "delete.success.invoice": "Invoice berhasil dihapus",
    "delete.success.rateCard": "Daftar harga berhasil dihapus",
    "delete.success.template": "Template berhasil dihapus",

    // ---- Restore / Clear All Data modals ----
    "modal.restoreTitle": "Pulihkan cadangan?",
    "modal.restoreText1": "Data Anda saat ini akan digantikan oleh data dari cadangan ini.",
    "modal.backupDateLabel": "Tanggal cadangan:",
    "modal.restoreText2": "Data saat ini akan ditimpa.",
    "modal.clearAllTitle": "Hapus semua data aplikasi?",
    "modal.clearAllText1": "Ini akan menghapus secara permanen semua proyek, dokumen, daftar harga, template, dan pengaturan yang tersimpan di browser ini.",
    "modal.clearAllText2": "Ini tidak dapat dibatalkan kecuali Anda memiliki cadangan.",
    "modal.typeDeleteToConfirm": "Ketik DELETE untuk konfirmasi",
    "modal.deleteEverything": "Hapus Semuanya",

    // ---- Pricing Calculator: save feedback ----
    "calc.updated": "Diperbarui! Perubahan pada \"{{name}}\" sudah tersimpan.",
    "calc.savedAsNew": "Disimpan sebagai proyek baru \u2014 proyek yang Anda edit tidak dapat ditemukan. \"{{name}}\" sekarang muncul di Proyek Terbaru.",
    "calc.saveError.notFound": "Gagal menyimpan \u2014 proyek yang Anda edit tidak dapat ditemukan, dan penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "calc.saveError.generic": "Gagal menyimpan perubahan Anda \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "calc.saved": "Tersimpan! \"{{name}}\" sekarang muncul di Proyek Terbaru pada Dashboard.",
    "calc.saveError.create": "Gagal menyimpan proyek ini \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "calc.updateProjectBtn": "Perbarui Proyek",
    "calc.saveToProjectBtn": "Simpan ke Proyek",
    "calc.health.lowMargin.label": "Margin Rendah",
    "calc.health.lowMargin.note": "Margin profit di bawah 15% \u2014 pertimbangkan naikkan harga atau turunkan biaya.",
    "calc.health.highRisk.label": "Risiko Tinggi",
    "calc.health.highRisk.note": "Buffer risiko di atas 30% \u2014 pastikan scope project memang serba tidak pasti.",
    "calc.health.healthy.label": "Sehat",
    "calc.health.healthy.note": "Margin dan buffer risiko kamu dalam kisaran sehat.",
    "calc.health.neutral.note": "Isi data project untuk melihat status kesehatan harga.",
    "calc.profitAnalysis.title": "Analisis Profit",
    "calc.pricingHealth.title": "Kesehatan Harga",
    "calc.estimatedProfit": "Estimasi Profit",
    "calc.profitMargin": "Margin Profit",
    "calc.hourlyEarnings": "Penghasilan per Jam",
    "calc.field.projectName": "Nama Proyek",
    "calc.field.serviceType": "Jenis Layanan",
    "calc.field.estimatedHours": "Estimasi Jam Kerja",
    "calc.field.hourlyRate": "Tarif per Jam",
    "calc.field.additionalExpenses": "Biaya Tambahan",
    "calc.field.includedRevisions": "Revisi yang Termasuk",
    "calc.field.revisionFee": "Fee per Revisi Tambahan",
    "calc.field.expectedRevisions": "Perkiraan Revisi Tambahan",
    "calc.field.riskBuffer": "Buffer Risiko / Proyek",
    "calc.field.targetMargin": "Target Margin Profit",
    "search.projects": "Cari proyek...",
    "search.quotations": "Cari penawaran...",
    "search.proposals": "Cari proposal...",
    "search.invoices": "Cari invoice...",
    "search.rateCards": "Cari daftar harga atau layanan...",
    "search.templates": "Cari template...",
    "placeholder.proposalOverview": "Jelaskan secara singkat proyek, tujuannya, dan hasil yang diharapkan.",
    "placeholder.invoicePaymentInstructions": "Silakan lakukan pembayaran ke rekening di atas dan kirim bukti pembayaran setelah transfer selesai.",
    "placeholder.settingsPaymentInstructions": "Silakan transfer ke rekening di atas dan kirim konfirmasi pembayaran.",
    "placeholder.rateCardNotes": "Harga dapat berubah sesuai kompleksitas project.",
    "section.projectInformation": "Informasi Proyek",
    "section.quotationDetails": "Detail Penawaran",
    "section.clientInformation": "Informasi Client",
    "section.businessInformation": "Informasi Bisnis",
    "section.quotationItems": "Item Penawaran",
    "section.discountTax": "Diskon & Pajak",
    "section.paymentTerms": "Syarat Pembayaran",
    "section.notesTerms": "Catatan & Syarat",
    "section.summary": "Ringkasan",
    "section.proposalDetails": "Detail Proposal",
    "section.projectOverview": "Overview Proyek",
    "section.proposalContent": "Konten Proposal",
    "section.investment": "Investasi",
    "section.invoiceDetails": "Detail Invoice",
    "section.billToClientInformation": "Ditagihkan Kepada / Informasi Client",
    "section.yourBusiness": "Bisnis Anda",
    "section.invoiceItems": "Item Invoice",
    "section.paymentInformation": "Informasi Pembayaran",
    "section.notes": "Catatan",
    "section.businessIdentity": "Identitas Bisnis",
    "section.documentPreferences": "Preferensi Dokumen",
    "section.dataBackup": "Data & Cadangan",
    "section.dangerZone": "Zona Berbahaya",
    "section.businessProfile": "Profil Bisnis",
    "section.rateCardInformation": "Informasi Daftar Harga",
    "section.services": "Layanan",
    "calc.breakdown.workingHours": "Jam Kerja",
    "calc.breakdown.hoursValue": "{{hours}} jam",
    "calc.breakdown.laborCost": "Biaya Tenaga Kerja",
    "calc.breakdown.additionalExpenses": "Biaya Tambahan",
    "calc.breakdown.additionalRevision": "Revisi Tambahan",
    "calc.breakdown.baseCost": "Biaya Dasar",
    "calc.breakdown.riskBuffer": "Buffer Risiko ({{percent}}%)",
    "calc.breakdown.totalProjectCost": "Total Biaya Proyek",
    "calc.breakdown.profit": "Profit",
    "calc.recommendedPrice": "Harga yang Disarankan",
    "calc.revisionTotal": "Total Biaya Revisi",
    "revc.sectionTitle": "Detail Revisi",
    "revc.subtitle": "Hitung cepat biaya revisi tambahan yang diminta client.",
    "revc.projectLabel": "Ambil dari Project (opsional)",
    "revc.manualOption": "Manual",
    "revc.feeLabel": "Biaya per Revisi Tambahan",
    "revc.qtyLabel": "Jumlah Revisi Tambahan",
    "revc.breakdown.revisionsTimesFee": "{{qty}} revisi \u00d7 {{fee}}",

    // ---- Quotation/Proposal/Invoice/Rate Card save feedback ----
    "quotation.updated": "Diperbarui! {{number}} sudah tersimpan.",
    "quotation.savedAsNew": "Disimpan sebagai penawaran baru \u2014 penawaran yang Anda edit tidak dapat ditemukan. {{number}} sekarang muncul di Penawaran Saya.",
    "quotation.saveError.notFound": "Gagal menyimpan \u2014 penawaran yang Anda edit tidak dapat ditemukan, dan penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "quotation.saveError.generic": "Gagal menyimpan perubahan Anda \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "quotation.saved": "Tersimpan! {{number}} siap diunduh atau dibuka lagi kapan saja.",
    "quotation.saveError.create": "Gagal menyimpan penawaran ini \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",

    "proposal.updated": "Diperbarui! {{number}} sudah tersimpan.",
    "proposal.savedAsNew": "Disimpan sebagai proposal baru \u2014 proposal yang Anda edit tidak dapat ditemukan. {{number}} sekarang muncul di Proposal Saya.",
    "proposal.saveError.notFound": "Gagal menyimpan \u2014 proposal yang Anda edit tidak dapat ditemukan, dan penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "proposal.saveError.generic": "Gagal menyimpan perubahan Anda \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "proposal.saved": "Tersimpan! {{number}} siap diunduh atau dibuka lagi kapan saja.",
    "proposal.saveError.create": "Gagal menyimpan proposal ini \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",

    "invoice.updated": "Diperbarui! {{number}} sudah tersimpan.",
    "invoice.savedAsNew": "Disimpan sebagai invoice baru \u2014 invoice yang Anda edit tidak dapat ditemukan. {{number}} sekarang muncul di Invoice Saya.",
    "invoice.saveError.notFound": "Gagal menyimpan \u2014 invoice yang Anda edit tidak dapat ditemukan, dan penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "invoice.saveError.generic": "Gagal menyimpan perubahan Anda \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "invoice.saved": "Tersimpan! {{number}} siap diunduh atau dibuka lagi kapan saja.",
    "invoice.saveError.create": "Gagal menyimpan invoice ini \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",

    "rateCard.updated": "Diperbarui! \"{{title}}\" sudah tersimpan.",
    "rateCard.savedAsNew": "Disimpan sebagai daftar harga baru \u2014 daftar harga yang Anda edit tidak dapat ditemukan. \"{{title}}\" sekarang muncul di Daftar Harga Saya.",
    "rateCard.saveError.notFound": "Gagal menyimpan \u2014 daftar harga yang Anda edit tidak dapat ditemukan, dan penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "rateCard.saveError.generic": "Gagal menyimpan perubahan Anda \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",
    "rateCard.saved": "Tersimpan! \"{{title}}\" siap diunduh atau dibuka lagi kapan saja.",
    "rateCard.saveError.create": "Gagal menyimpan daftar harga ini \u2014 penyimpanan browser Anda mungkin penuh atau tidak tersedia. Coba lagi.",

    // ---- Deadline labels ----
    "deadline.overdueBy.one": "Terlambat {{n}} hari",
    "deadline.overdueBy.other": "Terlambat {{n}} hari",
    "deadline.dueToday": "Jatuh tempo hari ini",
    "deadline.dueTomorrow": "Jatuh tempo besok",
    "deadline.dueInDays": "Jatuh tempo dalam {{n}} hari",

    // ---- Project Detail: empty document sections ----
    "detail.noQuotationYet": "Belum ada penawaran",
    "detail.noProposalsYet": "Belum ada proposal",
    "detail.noInvoicesYet": "Belum ada invoice",
    "detail.createQuotation": "Buat Penawaran",
    "detail.newQuotation": "+ Penawaran Baru",
    "detail.createProposal": "Buat Proposal",
    "detail.newProposal": "+ Proposal Baru",
    "detail.createInvoice": "Buat Invoice",
    "detail.newInvoice": "+ Invoice Baru",
    "logo.noLogo": "Tidak ada logo",
    "template.createTitle": "Buat Template",
    "template.editingTitle": "Mengedit \"{{name}}\"",
    "quotation.defaultNotes": "Terima kasih atas pertimbangannya.",
    "invoice.defaultNotes": "Terima kasih atas kerja sama Anda.",
    "rateCard.defaultNotes": "Harga dapat berubah sesuai kompleksitas project.",
    "rateCard.defaultTitle": "Daftar Harga Layanan {{year}}",
    "proposal.defaultTitle": "Proposal Proyek",

    // ---- Shared field labels ----
    "field.projectName": "Nama Proyek",
    "field.serviceType": "Jenis Layanan",
    "field.estimatedWorkingHours": "Estimasi Jam Kerja",
    "field.hourlyRate": "Tarif per Jam",
    "field.additionalExpenses": "Biaya Tambahan",
    "field.includedRevisions": "Revisi Termasuk",
    "field.feePerAdditionalRevision": "Biaya per Revisi Tambahan",
    "field.expectedAdditionalRevisions": "Perkiraan Revisi Tambahan",
    "field.riskBuffer": "Buffer Risiko / Proyek",
    "field.targetProfitMargin": "Target Margin Profit",
    "field.date": "Tanggal",
    "field.validUntil": "Berlaku Hingga",
    "field.validUntilOptional": "Berlaku Hingga (opsional)",
    "field.validFrom": "Berlaku Sejak",
    "field.project": "Proyek",
    "field.clientName": "Nama Klien",
    "field.company": "Perusahaan",
    "field.email": "Email",
    "field.phone": "Telepon",
    "field.phoneWhatsapp": "Telepon / WhatsApp",
    "field.address": "Alamat",
    "field.logo": "Logo",
    "field.businessName": "Nama Bisnis",
    "field.website": "Situs Web",
    "field.loadFromTemplate": "Muat dari Template",
    "field.discount": "Diskon",
    "field.discountValue": "Nilai Diskon",
    "field.tax": "Pajak",
    "field.terms": "Ketentuan",
    "field.customPaymentTerms": "Ketentuan Pembayaran Kustom",
    "field.notes": "Catatan",
    "field.termsConditions": "Syarat & Ketentuan",
    "field.quotationNumber": "Nomor Penawaran",
    "field.invoiceNumber": "Nomor Invoice",
    "field.proposalNumber": "Nomor Proposal",
    "field.proposalTitle": "Judul Proposal",
    "field.projectInvestment": "Investasi Proyek",
    "field.issueDate": "Tanggal Terbit",
    "field.dueDate": "Tanggal Jatuh Tempo",
    "field.status": "Status",
    "field.paymentMethod": "Metode Pembayaran",
    "field.bankName": "Nama Bank",
    "field.accountName": "Nama Rekening",
    "field.accountNumber": "Nomor Rekening",
    "field.paymentInstructions": "Instruksi Pembayaran",
    "field.rateCardTitle": "Judul Daftar Harga",
    "field.templateName": "Nama Template",

    // ---- Settings-specific labels ----
    "settings.businessLogo": "Logo Bisnis",
    "settings.businessTagline": "Tagline Bisnis",
    "settings.ownerName": "Nama Pemilik",
    "settings.businessNameRequired": "Nama Bisnis *",
    "settings.emailRequired": "Email *",
    "settings.phoneWhatsappRequired": "Telepon / WhatsApp *",
    "settings.instagram": "Instagram",
    "settings.city": "Kota",
    "settings.country": "Negara",
    "settings.qrisImage": "Gambar QRIS",
    "settings.defaultTax": "Pajak Default",
    "settings.defaultValidUntil": "Berlaku Hingga Default",
    "settings.defaultPaymentTerms": "Ketentuan Pembayaran Default",
    "settings.currency": "Mata Uang",
    "calc.expensesHelp": "Software, stock photo, transport, plugin, outsourcing, dan biaya tambahan lainnya.",
    "calc.riskBufferHelp": "Buffer untuk perubahan scope, meeting tambahan, dan risiko project.",
    "backup.downloadHelp": "Cadangan diunduh sebagai file. Simpan file cadangan Anda di tempat yang aman.",
    "field.noSavedProjects": "Belum ada proyek tersimpan.",
    "field.createAProject": "Buat proyek",
    "quotation.orFillManually": "atau isi penawaran ini secara manual.",
    "proposal.orFillManually": "atau isi proposal ini secara manual.",
    "invoice.orFillManually": "atau isi invoice ini secara manual.",
    "section.paymentInfoOptionalNote": "Semua kolom di bawah ini opsional \u2014 kosongkan jika tidak relevan.",
    "section.documentPrefsSubtitle": "Nilai default yang diterapkan pada Penawaran, Proposal, dan Invoice baru.",
    "placeholder.calcName": "Profil Perusahaan Situs Web",
    "placeholder.propTitle": "Proposal Proyek",
    "placeholder.rateTitle": "Tarif Layanan 2026",
    "placeholder.tplName": "Paket Website",

    // ---- Help & Support: chrome ----
    "help.backToHelp": "Kembali ke Bantuan",
    "help.relatedArticles": "Artikel Terkait",
    "help.gettingStarted": "Memulai",
    "help.allFeatureGuides": "Semua Panduan Fitur",
    "help.faq": "FAQ",
    "help.dataAndTroubleshooting": "Data & Pemecahan Masalah",
    "help.category.troubleshooting": "Pemecahan Masalah",
    "help.dataStored.title": "Di mana data saya disimpan?",
    "help.dataStored.text": "Semua yang Anda buat disimpan di penyimpanan lokal browser ini \u2014 bukan di server, dan bukan di cloud. Data tidak otomatis sinkron antar perangkat, menghapus data browser dapat menghilangkan data aplikasi yang tersimpan, dan menggunakan browser atau perangkat lain tidak akan otomatis menampilkan data yang sama. Anda sebaiknya membuat cadangan secara berkala \u2014 lihat \"Cadangkan & Pulihkan Data Anda\" di atas.",
    "help.noResultsFor": "Tidak ada hasil untuk \u201c{{query}}\u201d. Coba kata lain, atau jelajahi panduan di bawah.",
    "help.resultsFor.one": "{{n}} hasil untuk \u201c{{query}}\u201d",
    "help.resultsFor.other": "{{n}} hasil untuk \u201c{{query}}\u201d",
    "help.searchPlaceholder": "Cari bantuan...",

    // ---- Dashboard ----
    "dashboard.greeting": "Selamat pagi, {{name}}",
    "dashboard.greeting.defaultName": "Freelancer",
    "dashboard.subtitle": "Berikut yang terjadi dengan bisnis freelance Anda.",
    "dashboard.productiveMsg": "Semoga harimu produktif!",
    "dashboard.welcome.title": "Ruang kerja freelance Anda sudah siap.",
    "dashboard.summary.totalProjects": "Total Proyek",
    "dashboard.summary.totalRevenue": "Total Pendapatan",
    "dashboard.summary.pendingProposals": "Proposal Tertunda",
    "dashboard.summary.approved": "Disetujui",
    "dashboard.backupData.title": "Cadangkan Data",
    "dashboard.backupData.recommended": "Pencadangan disarankan",
    "dashboard.backupData.neverBackedUp": "Data Anda belum pernah dicadangkan.",
    "dashboard.backupData.changedSinceBackup": "Ada perubahan setelah cadangan terakhir Anda.",
    "dashboard.backupData.oldBackup": "Cadangan terakhir Anda sudah {{days}} hari.",
    "dashboard.backupData.lastBackup": "Cadangan terakhir",
    "dashboard.backupData.today": "Hari ini, {{time}}",
    "dashboard.backupData.yesterday": "Kemarin",
    "dashboard.backupData.daysAgo": "{{days}} hari yang lalu",
    "dashboard.backupData.upToDate": "Cadangan sudah yang terbaru.",
    "dashboard.upcoming.title": "Mendatang",
    "dashboard.upcoming.empty": "Tidak ada tenggat waktu mendatang.",
    "dashboard.needsAttention.title": "Perlu Perhatian",
    "dashboard.needsAttention.allCaughtUp": "Semua sudah beres.",
    "dashboard.quickActions.title": "Aksi Cepat",
    "dashboard.recentProjects.title": "Proyek Terbaru",

    // ---- Settings: Appearance ----
    "settings.appearance.title": "Tampilan",
    "settings.appearance.desc": "Pilih tampilan Freelance Kit di perangkat ini.",

    // ---- Settings: Language ----
    "settings.language.title": "Bahasa",
    "settings.language.desc": "Pilih bahasa yang digunakan pada seluruh antarmuka aplikasi.",
    "settings.language.english": "English",
    "settings.language.indonesian": "Bahasa Indonesia",
    "settings.docLanguage.title": "Bahasa Dokumen",
    "settings.docLanguage.desc": "Bahasa yang dipakai di Quotation, Proposal, Invoice, dan Rate Card yang dibuat — bisa beda dari bahasa aplikasi di atas.",
    "settings.docLanguage.sameAsApp": "Sama Seperti Aplikasi",
    "settings.docLanguage.english": "English",
    "settings.docLanguage.indonesian": "Bahasa Indonesia",

    // ---- Toasts / confirmations ----
    "toast.savedSuccessfully": "Berhasil disimpan",
    "toast.deletedSuccessfully": "Berhasil dihapus",
    "confirm.deleteTitle": "Hapus item ini?",
    "confirm.deleteText": "Tindakan ini tidak dapat dibatalkan.",

    // ---- List page filters / sorting (common across list pages) ----
    "filter.allStatus": "Semua Status",
    "status.draft": "Draft",
    "status.sent": "Terkirim",
    "status.proposalSent": "Proposal Terkirim",
    "status.approved": "Disetujui",
    "status.rejected": "Ditolak",
    "status.completed": "Selesai",
    "status.accepted": "Diterima",
    "status.expired": "Kedaluwarsa",
    "status.paid": "Lunas",
    "status.overdue": "Jatuh Tempo",
    "sort.recentlyUpdated": "Urutkan: Terbaru Diperbarui",
    "sort.oldestUpdated": "Urutkan: Terlama Diperbarui",
    "sort.oldest": "Urutkan: Terlama",
    "sort.priceHighLow": "Urutkan: Harga (Tinggi ke Rendah)",
    "sort.priceLowHigh": "Urutkan: Harga (Rendah ke Tinggi)",
    "sort.totalHighLow": "Urutkan: Total (Tinggi ke Rendah)",
    "sort.totalLowHigh": "Urutkan: Total (Rendah ke Tinggi)",
    "sort.valueHighLow": "Urutkan: Nilai (Tinggi ke Rendah)",
    "sort.valueLowHigh": "Urutkan: Nilai (Rendah ke Tinggi)",
    "sort.highestValue": "Urutkan: Nilai Tertinggi",
    "sort.lowestValue": "Urutkan: Nilai Terendah",
    "sort.nameAZ": "Urutkan: Nama (A\u2013Z)",
    "sort.nameAZPlain": "Urutkan: Nama A\u2013Z",

    // ---- Empty states (list pages) ----
    "emptyState.rateCards.title": "Belum ada daftar harga",
    "emptyState.rateCards.text": "Buat daftar harga yang bisa dipakai berulang untuk merapikan layanan dan harga Anda.",
    "emptyState.rateCards.cta": "+ Buat Daftar Harga Pertama Anda",
    "emptyState.invoices.title": "Belum ada invoice",
    "emptyState.invoices.text": "Buat invoice profesional pertama Anda untuk klien.",
    "emptyState.invoices.cta": "+ Buat Invoice",
    "emptyState.proposals.title": "Belum ada proposal",
    "emptyState.proposals.text": "Buat proposal profesional pertama Anda untuk klien berikutnya.",
    "emptyState.proposals.cta": "+ Buat Proposal",
    "emptyState.quotations.title": "Belum ada penawaran",
    "emptyState.quotations.text": "Buat penawaran profesional pertama Anda untuk klien.",
    "emptyState.quotations.cta": "+ Buat Penawaran",
    "emptyState.templates.title": "Belum ada template",
    "emptyState.templates.text": "Simpan kumpulan item yang sering Anda pakai untuk digunakan kembali saat membuat dokumen.",
    "emptyState.templates.cta": "+ Buat Template Pertama Anda",

    // ---- Backup & Danger Zone (Settings) ----
    "backup.yourDataText": "Unduh salinan data Anda dan simpan dengan aman. Anda bisa menggunakannya untuk memulihkan data nanti atau memindahkannya ke perangkat lain.",
    "backup.restoreFromBackupText": "Pulihkan data Anda dari file cadangan yang pernah diekspor sebelumnya.",
    "backup.chooseFile": "Pilih File Cadangan",
    "settings.dataStoredLocallyWarning": "Menghapus data browser atau berganti perangkat dapat menghilangkan akses ke data Anda. Kami sarankan mengunduh cadangan secara berkala.",
    "settings.resetBusinessProfileText": "Menghapus semua kolom Profil Bisnis di atas. Dokumen yang sudah Anda simpan tidak terpengaruh.",
    "settings.clearAllDataText": "Menghapus permanen semua proyek, dokumen, daftar harga, template, dan pengaturan tersimpan dari browser ini. Tindakan ini tidak dapat dibatalkan kecuali Anda memiliki cadangan.",

    // ---- Default placeholder user (data.js) ----
    "user.defaultName": "Nama Anda",
    "user.defaultEmail": "email@contoh.com",

    // ---- My Projects: summary bar + table headers ----
    "myProjects.summary.totalProjects": "Total Proyek",
    "myProjects.summary.totalEstimatedValue": "Total Estimasi Nilai",
    "myProjects.summary.lastUpdated": "Terakhir Diperbarui",
    "myProjects.table.project": "Proyek",
    "myProjects.table.client": "Klien",
    "myProjects.table.projectValue": "Nilai Proyek",
    "myProjects.table.status": "Status",
    "myProjects.table.lastUpdated": "Terakhir Diperbarui",
    "myProjects.table.actions": "Aksi",

    // ---- Document preview (Invoice / Quotation / Proposal / Rate Card) ----
    "doc.yourBusinessName": "Nama Bisnis Anda",
    "doc.clientNamePlaceholder": "Nama Klien",
    "doc.noItemsYet": "Belum ada item",
    "doc.date": "Tanggal",
    "doc.due": "Jatuh Tempo",
    "doc.billTo": "Ditagihkan Kepada",
    "doc.project": "Proyek",
    "doc.description": "Deskripsi",
    "doc.qty": "Jml",
    "doc.price": "Harga",
    "doc.total": "Total",
    "doc.subtotal": "Subtotal",
    "doc.tax": "Pajak",
    "doc.grandTotal": "TOTAL",
    "doc.paymentInformation": "Informasi Pembayaran",
    "doc.paymentTerms": "Syarat Pembayaran",
    "doc.notes": "Catatan",
    "doc.invoiceTitle": "INVOICE",
    "doc.quotationTitle": "PENAWARAN",
    "doc.proposalTitle": "PROPOSAL",
    "doc.dueOnReceipt": "Jatuh tempo saat diterima",
    "doc.validUntil": "Berlaku Hingga",
    "doc.termsConditions": "Syarat & Ketentuan",
    "doc.projectProposalKicker": "PROPOSAL PROYEK",
    "doc.projectTitlePlaceholder": "Judul proyek Anda akan muncul di sini",
    "doc.proposalLabel": "Proposal",
    "doc.preparedFor": "Disiapkan Untuk",
    "doc.introduction": "Pendahuluan",
    "doc.objectives": "Tujuan",
    "doc.scopeOfWork": "Ruang Lingkup Pekerjaan",
    "doc.deliverables": "Hasil Kerja",
    "doc.timeline": "Linimasa",
    "doc.phase": "Fase",
    "doc.investment": "Investasi",
    "doc.nextSteps": "Langkah Berikutnya",
    "doc.thankYou": "Terima kasih.",
    "doc.validFrom": "Berlaku dari",
    "doc.to": "sampai",
    "doc.serviceRates": "Daftar Harga Layanan",
    "doc.service": "Layanan",
    "doc.noServicesYet": "Belum ada layanan",
    "doc.discount": "Diskon",
    "doc.bank": "Bank",
    "doc.accountName": "Nama Rekening",
    "doc.accountNumber": "Nomor Rekening",

    // ---- Dashboard: Business Profile prompt card ----
    "profileCard.title": "Profil Bisnis",
    "profileCard.text": "Lengkapi profil bisnis Anda untuk mempercepat pembuatan penawaran, proposal, dan invoice.",
    "profileCard.cta": "Atur Profil",

    // ---- Table headers (dashboard mini-table + list pages) ----
    "table.project": "Proyek",
    "table.client": "Klien",
    "table.price": "Harga",
    "table.status": "Status",
    "table.updated": "Diperbarui",
    "table.actions": "Aksi",
    "table.invoice": "Invoice",
    "table.total": "Total",
    "table.proposal": "Proposal",
    "table.value": "Nilai",
    "table.quotation": "Penawaran",
    "table.rateCard": "Daftar Harga",
    "table.validFrom": "Berlaku Dari",
    "table.template": "Template",
    "table.totalValue": "Total Nilai",

    // ---- Proposal builder: add-item buttons & defaults ----
    "action.addObjective": "+ Tambah Objektif",
    "action.addScope": "+ Tambah Item",
    "action.addDeliverable": "+ Tambah Hasil Kerja",
    "action.addPhase": "+ Tambah Fase",
    "prop.shortDescPlaceholder": "Deskripsi singkat (opsional)",
    "prop.phaseDescPlaceholder": "Riset & Perencanaan",
    "prop.defaultPhase1": "Riset & Perencanaan",
    "prop.defaultPhase2": "Desain & Pengembangan",
    "prop.defaultDuration3Days": "3 Hari",
    "prop.defaultDuration10Days": "10 Hari",
    "prop.defaultObjective": "Memberikan hasil profesional yang memenuhi tujuan proyek",
    "prop.defaultDeliverable": "Hasil kerja akhir sesuai kesepakatan dalam ruang lingkup pekerjaan",

    // ---- Proposal builder: hardcoded empty-list messages & placeholders ----
    "prop.emptyObjectives": "Belum ada objektif. Klik \"+ Tambah Objektif\".",
    "prop.emptyDeliverables": "Belum ada hasil kerja. Klik \"+ Tambah Hasil Kerja\".",
    "prop.emptyScope": "Belum ada item. Klik \"+ Tambah Item\".",
    "prop.emptyTimeline": "Belum ada fase. Klik \"+ Tambah Fase\".",
    "prop.objectivePlaceholder": "Meningkatkan kehadiran online",
    "prop.deliverablePlaceholder": "Halaman Utama",
    "prop.defaultScope1": "Desain UI/UX",
    "prop.defaultScope2": "Pengembangan",
    "prop.defaultNextSteps": "1. Tinjau proposal ini\n2. Konfirmasi ruang lingkup proyek\n3. Lakukan pembayaran awal\n4. Pekerjaan proyek dimulai",
    "prop.defaultTerms": "Ruang lingkup proyek dan harga didasarkan pada kebutuhan yang dijelaskan dalam proposal ini.",

    // ---- Payment terms dropdown (Invoice) ----
    "terms.dueOnReceipt": "Jatuh tempo saat diterima",
    "terms.7days": "7 hari",
    "terms.14days": "14 hari",
    "terms.30days": "30 hari",
    "terms.custom": "Kustom",

    // ---- Payment split options (Quotation / Proposal / Settings default) ----
    "terms.split5050": "50% / 50%",
    "terms.split100Upfront": "100% di Muka",
    "terms.split3070": "30% / 70%",
    "terms.split5050Long": "Uang muka 50% / pelunasan 50%",
    "terms.split100UpfrontLong": "100% di muka",
    "terms.split3070Long": "Uang muka 30% / pelunasan 70%",
    "terms.netDueOnReceipt": "Jatuh tempo saat diterima",
    "terms.net7days": "Net 7 hari",
    "terms.net14days": "Net 14 hari",
    "terms.net30days": "Net 30 hari",

    // ---- Rate unit ----
    "unit.perHour": "/jam",

    // ---- Misc form chrome still missing ----
    "select.service": "Pilih layanan",
    "unit.hours": "jam",
    "discount.none": "Tidak Ada",
    "discount.percentage": "Persentase",
    "discount.fixedAmount": "Jumlah Tetap",
  },
};

function t(key, vars) {
  const lang = getAppLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let str = dict[key];
  if (str === undefined) str = TRANSLATIONS.en[key];
  if (str === undefined) return key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      str = str.replace(new RegExp(`{{${k}}}`, "g"), vars[k]);
    });
  }
  return str;
}

// Same lookup as t(), for an explicit language rather than the UI
// language — used to render document previews/PDFs in the Document
// Language setting above, independent of what language the app chrome
// itself is currently showing.
function tFor(lang, key, vars) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let str = dict[key];
  if (str === undefined) str = TRANSLATIONS.en[key];
  if (str === undefined) return key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      str = str.replace(new RegExp(`{{${k}}}`, "g"), vars[k]);
    });
  }
  return str;
}
function td(key, vars) {
  return tFor(getDocLanguage(), key, vars);
}

// Count-aware phrasing: English inflects ("1 project" / "2 projects"),
// Bahasa Indonesia doesn't ("1 proyek" / "2 proyek" — same word). Only
// a plain-English noun is needed per call site since Indonesian never
// needs the "s".
function tCount(n, singularEn, pluralEn, wordId) {
  const lang = getAppLanguage();
  if (lang === "id") return `${n} ${wordId}`;
  return `${n} ${n === 1 ? singularEn : pluralEn}`;
}

function applyStaticTranslations(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  scope.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  });
}

/* ---------------------------------------------------------------------
   LANGUAGE SWITCHER (Settings) — same segmented-control pattern as the
   sidebar's Appearance control. A language switch reloads the page
   rather than live re-rendering: every page's dynamic content (dates,
   statuses, counts) is then guaranteed correct with zero risk of a
   half-translated screen, and since all data is already persisted to
   localStorage synchronously on every save, a reload loses nothing.
   --------------------------------------------------------------------- */

function syncLanguageButtons() {
  const active = getAppLanguage();
  document.querySelectorAll('[data-language-set]').forEach((btn) => {
    const isActive = btn.dataset.languageSet === active;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

document.querySelectorAll('[data-language-set]').forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.languageSet === getAppLanguage()) return;
    setAppLanguage(btn.dataset.languageSet);
    location.reload();
  });
});

syncLanguageButtons();

function syncDocLanguageButtons() {
  const active = getDocLanguagePref();
  document.querySelectorAll('[data-doc-language-set]').forEach((btn) => {
    const isActive = btn.dataset.docLanguageSet === active;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

document.querySelectorAll('[data-doc-language-set]').forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.docLanguageSet === getDocLanguagePref()) return;
    setDocLanguagePref(btn.dataset.docLanguageSet);
    syncDocLanguageButtons();
  });
});

syncDocLanguageButtons();
