/* ==========================================================================
   HELP.JS
   Help & Support: documentation content for every feature that is
   actually built and working in this app (audited against calculator.js,
   projects.js, quotation.js, proposal.js, invoice.js, ratecard.js,
   templates.js, settings.js, and data.js — nothing here describes a
   feature that doesn't exist, e.g. there is no QRIS display on invoices,
   no live chat/ticket support, and no "Recent Activity" log).

   Structure:
   - ARTICLES: Getting Started (5) + one guide per real feature area.
   - FAQ_ITEMS / TROUBLESHOOTING_ITEMS: short Q&A, rendered as accordions.
   - A single search index covers all three so "quotation", "invoice",
     or "data hilang" surface the right content regardless of which
     bucket it lives in.
   - View state (home / search / article) is rendered entirely by this
     file into [data-help-content] — index.html only holds the search
     input and an empty content container.
   ========================================================================== */

const helpPanel = document.querySelector('[data-page-panel="help"]');

if (helpPanel) {

  const contentEl = helpPanel.querySelector('[data-help-content]');
  const searchInput = helpPanel.querySelector('[data-help-search]');

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const ICONS = {
    play: '<path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor"/>',
    profile: '<circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 13c.9-2.6 2.9-4 5.2-4s4.3 1.4 5.2 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    flow: '<circle cx="4" cy="4" r="1.6" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12" r="1.6" stroke="currentColor" stroke-width="1.3"/><path d="M5.4 5.2 10.6 10.8" stroke="currentColor" stroke-width="1.3"/>',
    storage: '<rect x="2.5" y="3" width="11" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2.5" y="9" width="11" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/>',
    rocket: '<path d="M8 2.5c2 1 3 3.4 2.7 6.2l-1.8 1.8-2.4-2.4L8 5.3c0-1 0-1.9-.3-2.8Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
    dashboard: '<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.3"/>',
    calc: '<rect x="3" y="2" width="10" height="12" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.3 5h5.4M5.3 8h1.6M9 8h1.6M5.3 11h1.6M9 11h1.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    revision: '<path d="M13 8A5 5 0 1 1 11.3 4.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M13 2.8V5.8H10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
    projects: '<path d="M2.5 5h11M2.5 5v6.5A1.5 1.5 0 0 0 4 13h8a1.5 1.5 0 0 0 1.5-1.5V5M2.5 5l1-2h9l1 2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
    doc: '<rect x="3.5" y="2" width="9" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 5.3h5M5.5 8h5M5.5 10.7h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    ratecard: '<rect x="2.5" y="3" width="11" height="10" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5 6.3h6M5 9h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    template: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 6.3h11" stroke="currentColor" stroke-width="1.2"/>',
    settings: '<circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5v1.6M8 11.9v1.6M13.5 8h-1.6M4.1 8H2.5M11.8 4.2l-1.1 1.1M5.3 10.7l-1.1 1.1M11.8 11.8l-1.1-1.1M5.3 5.3 4.2 4.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  };

  function tileIcon(name) {
    return `<svg width="15" height="15" viewBox="0 0 16 16" fill="none">${ICONS[name] || ICONS.doc}</svg>`;
  }

  /* ---------------------------------------------------------------------
     CONTENT — every fact below matches real, working behavior audited
     from the corresponding JS/HTML for that feature.
     --------------------------------------------------------------------- */

  const ARTICLES_EN = [
    // ---- GETTING STARTED (5) ----
    {
      id: "welcome",
      category: "Getting Started",
      badge: "01",
      title: "Welcome to the App",
      desc: "What this toolkit does and how it's organized",
      keywords: ["intro", "overview", "start", "mulai"],
      related: ["business-profile", "main-workflow", "first-project"],
      sections: [
        { body: "This app is a browser-based pricing and document toolkit for freelancers: it helps you price a project, generate a Quotation, Proposal, Invoice, or Rate Card for it, and keep reusable pricing Templates — all in one place." },
        { heading: "No account needed", body: "There's no login or sign-up. The app opens straight into the Dashboard, and everything you create is saved in this browser (see \"Where Your Data Is Stored\")." },
        { heading: "The main areas", body: [
          "Pricing Calculator & Revision Calculator — work out what to charge",
          "Quotation, Proposal, and Invoice Generators — create client-facing documents",
          "Rate Cards & Templates — reusable pricing tools",
          "Settings — your business profile, used to prefill new documents",
        ] },
      ],
    },
    {
      id: "business-profile-setup",
      category: "Getting Started",
      badge: "02",
      title: "Set Up Your Business Profile",
      desc: "Fill this once, it prefills every new document",
      keywords: ["settings", "profile", "logo", "payment info", "bank"],
      related: ["settings-guide", "quotation-guide"],
      sections: [
        { body: "Go to Settings and fill in your business details. Business Name, Email, and Phone are required; everything else is optional." },
        { heading: "What you can add", body: [
          "Identity: tagline, owner name, logo, website, Instagram, address/city/country",
          "Payment info: payment method, bank name, account name, account number, payment instructions",
          "Defaults: Default Tax %, Default \"Valid Until\" days, and Default Payment Terms — these auto-fill new Quotations",
        ] },
        { heading: "How it's used", body: "Once saved, this profile automatically fills the business section of every new Quotation, Proposal, and Invoice you create, so you don't retype it each time." },
      ],
    },
    {
      id: "main-workflow",
      category: "Getting Started",
      badge: "03",
      title: "Understand the Main Workflow",
      desc: "How pricing, projects, and documents connect",
      keywords: ["workflow", "flow", "alur kerja", "process"],
      related: ["pricing-calculator-guide", "my-projects-guide", "quotation-guide"],
      sections: [
        { heading: "The typical path", body: [
          "Pricing Calculator — work out a recommended price",
          "Save to Project — it appears in My Projects and on the Dashboard",
          "Create a Quotation or Proposal — from Project Detail, with client/project data prefilled",
          "Create an Invoice — when the work is agreed or delivered",
        ] },
        { body: "This isn't required, though — you can also open the Quotation, Proposal, or Invoice Generator directly and fill everything in manually without ever using the Calculator or a Project." },
        { body: "Rate Cards and Templates sit outside this chain: a Rate Card is a standalone price-list document, and a Template is a reusable set of line items you can insert into a Quotation or Invoice." },
      ],
    },
    {
      id: "data-storage",
      category: "Getting Started",
      badge: "04",
      title: "Where Your Data Is Stored",
      desc: "Local browser storage — what that means for you",
      keywords: ["storage", "localstorage", "browser", "sync", "cloud", "backup", "lost", "hilang", "data hilang", "missing data", "clear cache", "incognito", "privasi"],
      related: ["backup-restore-guide", "settings-guide"],
      sections: [
        { body: "Every project, quotation, proposal, invoice, rate card, template, and your business profile is saved in this browser's local storage — not on a server, and not in the cloud." },
        { heading: "What that means in practice", body: [
          "Data does not automatically sync between devices — opening the app on another browser or device starts empty",
          "Clearing your browser's data may remove your saved app data",
          "Using a different browser or device will not automatically show the same data",
          "Private/incognito windows may not keep the data after you close them",
          "You should create backups regularly, since this is the only way to move data between devices or recover it if something happens to this browser",
        ] },
        { body: "See \"Backup & Restore Your Data\" for how to download a backup, and the Data & Troubleshooting section below for what to do if something looks missing." },
      ],
    },
    {
      id: "first-project",
      category: "Getting Started",
      badge: "05",
      title: "Your First Project",
      desc: "Step by step, from price to saved project",
      keywords: ["first", "getting started", "new project"],
      related: ["pricing-calculator-guide", "my-projects-guide"],
      sections: [
        { heading: "Steps", body: {
          steps: [
            "Open Pricing Calculator from the sidebar",
            "Fill in Project Name, Service Type, Estimated Working Hours, and Hourly Rate",
            "Optionally add Additional Expenses, Included Revisions, and a Risk Buffer / Profit Margin",
            "Watch the Recommended Price update live as you type",
            "Click \"Save to Project\"",
          ],
        } },
        { body: "The project now appears on the Dashboard and in My Projects. Open it to set a Client name, change its Status, or create a Quotation, Proposal, or Invoice from it." },
      ],
    },

    // ---- FEATURE GUIDES ----
    {
      id: "dashboard-guide",
      category: "Dashboard",
      badge: "dashboard",
      title: "Dashboard",
      desc: "Your summary numbers and what they mean",
      keywords: ["dashboard", "summary", "revenue", "home", "backup reminder"],
      related: ["my-projects-guide", "first-project", "backup-restore-guide"],
      sections: [
        { heading: "Summary cards", body: [
          "Total Projects — count of every project you've saved",
          "Total Revenue — sum of price for projects with status Approved or Completed only (not all projects)",
          "Pending Proposals — count of projects with status \"Proposal Sent\"",
          "Approved — count of projects with status \"Approved\"",
        ] },
        { heading: "Backup Reminder", body: "If you have real saved data but haven't backed up yet, or your last backup is getting old or you've made changes since, a compact reminder appears here with a one-click backup button. \"Remind Me Later\" hides it for about a week. See \"Backup & Restore Your Data\" for details." },
        { heading: "Upcoming panel", body: "Shows sent Quotations and Proposals nearing their Valid Until date, plus sent or overdue Invoices nearing their Due Date — the soonest few, or nothing if there aren't any." },
        { heading: "Recent Projects", body: "Your most recently updated projects; click a row to open its Project Detail." },
        { heading: "Quick Actions", body: "Shortcuts to Pricing Calculator, Quotation Generator, Proposal Generator, and Invoice Generator." },
        { body: "If you have no projects yet, the Dashboard shows a welcome state with a \"Load Sample Data\" option — this creates real, editable, deletable example projects so you can see the app in action; it's not locked demo data." },
      ],
    },
    {
      id: "pricing-calculator-guide",
      category: "Pricing Calculator",
      badge: "calc",
      title: "Pricing Calculator",
      desc: "Work out a recommended price from your costs",
      keywords: ["calculator", "price", "harga", "margin", "buffer", "kalkulator"],
      related: ["first-project", "revision-calculator-guide", "my-projects-guide"],
      sections: [
        { body: "Use this to turn your hours, rate, expenses, and target margin into a recommended project price." },
        { heading: "Fields", body: [
          "Project Name, Service Type",
          "Estimated Working Hours, Hourly Rate",
          "Additional Expenses",
          "Included Revisions, Fee per Additional Revision, Expected Additional Revisions",
          "Risk / Project Buffer (0–50%)",
          "Target Profit Margin (0–95%)",
        ] },
        { heading: "Reading the result", body: "The Recommended Price updates live as you type, alongside a price range and a full breakdown (Labor Cost, Additional Expenses, Additional Revision cost, Base Cost, Risk Buffer, Total Cost, Profit, and Profit Margin). A health badge — Healthy, Low Margin, or High Risk — reacts to your margin and buffer settings." },
        { heading: "Saving", body: "\"Save to Project\" stores the calculation to My Projects and the Dashboard. If you opened the Calculator to edit an existing project (via \"Edit Pricing\"), the button instead reads \"Update Project\" and saves changes back to that same project." },
        { heading: "Reset", body: "Clears the form back to empty. It does not delete anything you've already saved." },
      ],
    },
    {
      id: "revision-calculator-guide",
      category: "Revision Calculator",
      badge: "revision",
      title: "Revision Calculator",
      desc: "A quick lookup for extra-revision charges",
      keywords: ["revision", "revisi"],
      related: ["pricing-calculator-guide"],
      sections: [
        { body: "A quick, standalone calculator for what to charge when a client asks for revisions beyond what's included." },
        { heading: "How to use it", body: "Optionally pick a saved Project from the dropdown to auto-fill its \"Fee per Additional Revision\" — or leave it on Manual and type your own. Enter the fee and the number of extra revisions; the total updates live." },
        { body: "This result isn't saved anywhere — it's a quick calculation, not a document. \"Reset\" clears the form." },
      ],
    },
    {
      id: "my-projects-guide",
      category: "My Projects",
      badge: "projects",
      title: "My Projects",
      desc: "Every project you've saved, and Project Detail",
      keywords: ["projects", "project detail", "status"],
      related: ["pricing-calculator-guide", "quotation-guide", "dashboard-guide"],
      sections: [
        { body: "Lists every project saved from the Pricing Calculator, with a summary bar (Total Projects, Total Estimated Value, Last Updated)." },
        { heading: "Search, filter, sort", body: "Search matches project name or client. Filter by status. Sort by Recently Updated, Oldest, Price (high–low or low–high), or Name A–Z." },
        { heading: "Row actions", body: ["Open — view Project Detail", "Edit Pricing — back to the Calculator, prefilled", "Delete — removes the project only"] },
        { heading: "Project Detail", body: "Lets you edit the Client name inline, change Status, review the full pricing breakdown, and create or open any Quotation, Proposal, or Invoice already linked to this project." },
        { heading: "Statuses", body: ["Draft", "Proposal Sent", "Approved", "Rejected", "Completed"], enum: true },
        { body: "Deleting a project does not delete quotations, proposals, or invoices already created from it — those stay intact." },
      ],
    },
    {
      id: "quotation-guide",
      category: "Quotation",
      badge: "doc",
      title: "Quotation Generator & My Quotations",
      desc: "Price offers before a project is agreed",
      keywords: ["quotation", "quote", "penawaran", "qt"],
      related: ["templates-guide", "my-projects-guide", "invoice-guide"],
      sections: [
        { body: "A Quotation is a price offer you send a client before the project is agreed." },
        { heading: "Numbering", body: "Each new quotation gets an automatic number like QT-202609-001 — the year and month, then a sequence that always continues from the highest number saved for that month." },
        { heading: "Setup", body: "Optionally link a saved Project (this fills in the client name and a starting line item) or leave it on \"Manual\" and fill everything by hand. Client Info (name, company, email, phone, address) and Business Info are separate fields — Business Info is prefilled from your Business Profile and can be refreshed anytime with \"Use latest Business Profile\", plus it has its own logo upload." },
        { heading: "Items", body: "Add line items with description, quantity, and unit price — totals recalculate as you type. \"Load from Template\" lets you append a saved Template's items in one click." },
        { heading: "Discount, Tax, Terms", body: ["Discount — None, Percentage, or Fixed Amount", "Tax — a percentage", "Payment Terms — 50/50, 100% Upfront, 30/70, or Custom", "Notes and Terms & Conditions text fields"] },
        { heading: "Saving & PDF", body: "A save-status indicator shows Unsaved changes vs Saved. \"Save Quotation\" requires Business Name, Client Name, and at least one item. \"Export PDF\" opens your browser's print dialog — choose \"Save as PDF\" as the destination." },
        { heading: "My Quotations", body: "Search, filter by status, and sort by date or total. Each row lets you change Status inline (Draft, Sent, Accepted, Rejected, Expired), Open the quotation, Export PDF, or Delete." },
      ],
    },
    {
      id: "proposal-guide",
      category: "Proposal",
      badge: "doc",
      title: "Proposal Generator & My Proposals",
      desc: "A fuller pitch document with scope and investment",
      keywords: ["proposal", "pitch", "scope", "objectives", "deliverables", "timeline"],
      related: ["quotation-guide", "invoice-guide"],
      sections: [
        { body: "A Proposal is a more detailed pitch document — overview, scope, and investment — used to convince a client, typically before or alongside a Quotation." },
        { heading: "Numbering", body: "Each new proposal gets an automatic number like PR-202609-001, following the same rule as Quotations." },
        { heading: "Setup", body: "Same Project-link, Client Info, and Business Info pattern as Quotation, including \"Use latest Business Profile\" and its own logo." },
        { heading: "Content sections", body: ["Overview", "Objectives (a list you build)", "Scope of Work (a list)", "Deliverables (a list)", "Timeline (phases you add)", "Project Investment — a single amount, not itemized line items", "Payment Terms (50/50, 100% Upfront, 30/70, or Custom)", "Next Steps", "Terms & Conditions"], enum: true },
        { body: "There's no discount/tax or line-item Template loading here — Investment is one figure you set directly, not calculated from items." },
        { heading: "Saving & PDF", body: "\"Save Proposal\" or \"Export PDF\" (via your browser's print dialog), same as Quotation." },
        { heading: "My Proposals", body: "Search, filter by status, and sort by date, value, or name. Inline Status (Draft, Sent, Accepted, Rejected), Open, Export PDF, or Delete." },
      ],
    },
    {
      id: "invoice-guide",
      category: "Invoice",
      badge: "doc",
      title: "Invoice Generator & My Invoices",
      desc: "The bill you send once work is agreed",
      keywords: ["invoice", "tagihan", "bill", "payment", "due date", "qris", "bank"],
      related: ["quotation-guide", "templates-guide", "settings-guide"],
      sections: [
        { body: "An Invoice is the actual bill you send once the work is agreed on or delivered." },
        { heading: "Numbering", body: "Each new invoice gets an automatic number like INV-202609-001, following the same rule as Quotations." },
        { heading: "Setup", body: "Project link, Client Info, and Business Info follow the same pattern as Quotation. You also set an Issue Date and a Due Date." },
        { heading: "Items, discount, tax", body: "Line items (description, quantity, unit price), plus Discount (None/Percentage/Fixed) and Tax (%), same as Quotation." },
        { heading: "Payment information", body: "Payment Method (Bank Transfer, E-Wallet, Cash, or Other), Bank Name, Account Name, Account Number, and Payment Instructions — these prefill from your Business Profile if you've saved them there. Payment Terms options are Due on receipt, 7 days, 14 days, 30 days, or Custom." },
        { heading: "Status", body: "Draft, Sent, Paid, Overdue — set on the form itself or changed inline from My Invoices." },
        { heading: "Saving & PDF", body: "\"Save Invoice\" or \"Export PDF\" via your browser's print dialog, same as the other generators." },
        { heading: "My Invoices", body: "Search, filter by status, sort by date or total. Inline Status, Open, Export PDF, or Delete." },
        { body: "Note: you can upload a QRIS image in Settings, but it isn't inserted into generated invoices — the payment details that actually appear on an invoice are the bank/payment fields listed above." },
      ],
    },
    {
      id: "rate-cards-guide",
      category: "Rate Cards",
      badge: "ratecard",
      title: "Rate Cards & My Rate Cards",
      desc: "A standalone, printable price list",
      keywords: ["rate card", "price list", "services", "harga jasa"],
      related: ["templates-guide"],
      sections: [
        { body: "A Rate Card is a standalone document that lists your service pricing — for sharing your standard rates with a client. It's not tied to a specific deal, and it does not feed into a Quotation or Invoice." },
        { heading: "Building one", body: "Fill in your Business Info (name, logo, contact), add Services (description, price, and a unit like \"/hour\" or \"/project\"), optional Notes, and an optional Valid From/Until date range." },
        { heading: "Saving & PDF", body: "\"Save Rate Card\" or \"Export PDF\" via your browser's print dialog." },
        { heading: "My Rate Cards", body: "Summary bar (Total Rate Cards, Total Services, Average Rate), search, sort, and row actions: Open, Export PDF, Delete." },
        { body: "If you want reusable items you can insert directly into a Quotation or Invoice, use Templates instead — see \"Rate Card vs Template\" below." },
      ],
    },
    {
      id: "templates-guide",
      category: "Templates",
      badge: "template",
      title: "Templates",
      desc: "Reusable line items you can drop into a document",
      keywords: ["template", "reusable items", "load from template"],
      related: ["rate-cards-guide", "quotation-guide", "invoice-guide"],
      sections: [
        { body: "A Template is a saved, reusable bundle of line items (description, quantity, unit price) that you can insert into a Quotation or Invoice — this is what makes it different from a Rate Card (see below)." },
        { heading: "Creating one", body: "Click \"+ New Template\", give it a name, add items with quantity and price, then Save." },
        { heading: "Using one", body: "From the Templates list, each row has a \"•••\" menu with \"Use in Quotation\" or \"Use in Invoice\" — this appends the template's items to whichever generator you pick, without changing the saved template itself. You can also load a template from inside the Quotation or Invoice Generator directly, via their \"Load from Template\" dropdown." },
        { heading: "Managing templates", body: "Search by name or item, sort by recently updated/oldest/name. Row actions: Edit, Duplicate, Delete." },
        { heading: "Rate Card vs Template", body: "A Rate Card is a standalone document you hand to a client — a price list. A Template is a set of line items you insert into a Quotation or Invoice you're already building. They're saved and managed separately." },
      ],
    },
    {
      id: "settings-guide",
      category: "Settings",
      badge: "settings",
      title: "Settings & Business Profile",
      desc: "One profile that prefills every new document",
      keywords: ["settings", "business profile", "currency", "tax default", "reset profile", "data management", "backup", "clear all data"],
      related: ["business-profile-setup", "backup-restore-guide", "quotation-guide"],
      sections: [
        { body: "Settings holds one shared Business Profile used to prefill every new Quotation, Proposal, and Invoice." },
        { heading: "Fields", body: ["Business Name*, Tagline, Owner Name (* = required, along with Email and Phone)", "Email*, Phone*, Website, Instagram", "Address, City, Country, Logo", "Payment Method, Bank Name, Account Name, Account Number, Payment Instructions", "QRIS image (saved to your profile; not yet shown on generated documents)", "Default Tax %, Default \"Valid Until\" days, Default Payment Terms — applied to new Quotations", "Currency — fixed to IDR"] },
        { heading: "Saving", body: "A save-status indicator shows Unsaved changes vs Changes saved, the same pattern as the document generators." },
        { heading: "Reset", body: "Clears your entire saved business profile — not just the defaults. Projects, quotations, proposals, and invoices you've already created are not affected." },
        { heading: "Important: documents are snapshots", body: "Changing your Business Profile does not retroactively update documents you've already saved — each one keeps the business info it had at creation time. To pull the newest profile info into an existing document, open it and click \"Use latest Business Profile\"." },
        { body: "Settings also has a \"Data & Backup\" section for downloading backups, restoring from a backup file, and clearing all app data — see \"Backup & Restore Your Data\" below." },
      ],
    },
    {
      id: "backup-restore-guide",
      category: "Backup & Restore",
      badge: "storage",
      title: "Backup & Restore Your Data",
      desc: "Download, restore, and clear your locally-stored data",
      keywords: ["backup", "restore", "download backup", "restore backup", "clear all data", "delete everything", "last backup created", "json", "export", "import", "another device", "move data"],
      related: ["data-storage", "settings-guide", "dashboard-guide"],
      sections: [
        { body: "Since everything is stored locally in your browser (see \"Where Your Data Is Stored\"), backups are the way to protect your work and move it between devices. Backup & Restore lives in Settings, under \"Data & Backup\"." },
        { heading: "What gets backed up", body: ["Business Profile", "Projects", "Quotations", "Proposals", "Invoices", "Rate Cards", "Templates"], enum: true },
        { heading: "How to create a backup", body: {
          steps: [
            "Open Settings",
            "Find the \"Data & Backup\" section",
            "Click \"Download Backup\"",
            "Your browser downloads a JSON file (named like freelance-kit-backup-2026-09-03.json)",
            "Save that file somewhere safe — your computer, an external drive, or your own cloud storage such as Google Drive",
          ],
        } },
        { body: "The app does not upload this file anywhere itself — saving it somewhere safe (including to your own cloud storage, if you choose) is up to you." },
        { heading: "\"Last backup created\"", body: "Settings and the Dashboard both show when you last downloaded a backup. This only means a backup was successfully created and downloaded — the app has no way to confirm the file still exists afterward, so it deliberately never claims your data is \"safely backed up.\"" },
        { heading: "Backup Reminder on the Dashboard", body: "If you have real saved data but no backup yet, or your last backup is 14+ days old or you've made changes since, the Dashboard shows a compact reminder with a \"Back Up Now\" / \"Create New Backup\" button. \"Remind Me Later\" hides it for about a week. This reminder is just a nudge — nothing is backed up automatically; you still create backups manually." },
        { heading: "How to restore from a backup", body: {
          steps: [
            "Open Settings and find \"Data & Backup\"",
            "Click \"Choose Backup File\" and select a previously downloaded backup .json file",
            "Review the preview — it shows the real backup date and how many Projects, Quotations, Proposals, Invoices, Rate Cards, and Templates it contains",
            "Click \"Restore Data\"",
            "Confirm in the dialog that appears (it shows the backup's date one more time)",
          ],
        } },
        { heading: "Restoring replaces your current data", body: "This is important: restoring does not merge or add to what you already have — it replaces it. For example, if you currently have 10 projects and restore a backup that has 5, you'll end up with those 5, not 15. Make sure any newer work is backed up first if you don't want to lose it." },
        { heading: "Backup validation", body: "Before restoring anything, the app checks that the file is valid JSON, belongs to this app, uses a supported backup version, and has a valid data structure. If any check fails, you'll see a clear error and your current data is left completely untouched." },
        { heading: "Clear All Data", body: "Settings' Danger Zone also has \"Clear All Data,\" which permanently deletes only this app's own saved data (projects, documents, rate cards, templates, and business profile) from this browser — it does not touch any other website's or app's data. It requires typing DELETE to confirm and cannot be undone, so it's worth downloading a backup first; if you ever need that data back, restoring the backup brings it back." },
      ],
    },
  ];

  const ARTICLES_ID = [
    // ---- MULAI (5) ----
    {
      id: "welcome",
      category: "Mulai",
      badge: "01",
      title: "Selamat Datang di Aplikasi",
      desc: "Apa yang dilakukan alat ini dan bagaimana strukturnya",
      keywords: ["intro", "overview", "start", "mulai"],
      related: ["business-profile", "main-workflow", "first-project"],
      sections: [
        { body: "Aplikasi ini adalah alat bantu harga dan dokumen berbasis browser untuk freelancer: membantu Anda menentukan harga sebuah proyek, membuat Penawaran, Proposal, Invoice, atau Daftar Harga untuknya, dan menyimpan Template harga yang dapat digunakan kembali — semuanya dalam satu tempat." },
        { heading: "Tidak perlu akun", body: "Tidak ada login atau pendaftaran. Aplikasi langsung terbuka ke Dashboard, dan semua yang Anda buat disimpan di browser ini (lihat \"Di Mana Data Anda Disimpan\")." },
        { heading: "Area utama", body: [
          "Kalkulator Harga & Kalkulator Revisi — menghitung berapa yang harus ditagihkan",
          "Generator Penawaran, Proposal, dan Invoice — membuat dokumen untuk client",
          "Daftar Harga & Template — alat harga yang dapat digunakan kembali",
          "Pengaturan — profil bisnis Anda, digunakan untuk mengisi otomatis dokumen baru",
        ] },
      ],
    },
    {
      id: "business-profile-setup",
      category: "Mulai",
      badge: "02",
      title: "Siapkan Profil Bisnis Anda",
      desc: "Isi sekali, akan mengisi otomatis setiap dokumen baru",
      keywords: ["settings", "profile", "logo", "payment info", "bank"],
      related: ["settings-guide", "quotation-guide"],
      sections: [
        { body: "Buka Pengaturan dan isi detail bisnis Anda. Nama Bisnis, Email, dan Telepon wajib diisi; sisanya opsional." },
        { heading: "Apa yang bisa Anda tambahkan", body: [
          "Identitas: tagline, nama pemilik, logo, website, Instagram, alamat/kota/negara",
          "Info pembayaran: metode pembayaran, nama bank, nama rekening, nomor rekening, instruksi pembayaran",
          "Default: % Pajak Default, jumlah hari \"Berlaku Hingga\" Default, dan Syarat Pembayaran Default — ini akan mengisi otomatis Penawaran baru",
        ] },
        { heading: "Bagaimana ini digunakan", body: "Setelah disimpan, profil ini akan otomatis mengisi bagian bisnis di setiap Penawaran, Proposal, dan Invoice baru yang Anda buat, jadi Anda tidak perlu mengetik ulang setiap kali." },
      ],
    },
    {
      id: "main-workflow",
      category: "Mulai",
      badge: "03",
      title: "Memahami Alur Kerja Utama",
      desc: "Bagaimana harga, proyek, dan dokumen saling terhubung",
      keywords: ["workflow", "flow", "alur kerja", "process"],
      related: ["pricing-calculator-guide", "my-projects-guide", "quotation-guide"],
      sections: [
        { heading: "Alur yang umum", body: [
          "Kalkulator Harga — menghitung harga yang direkomendasikan",
          "Simpan ke Proyek — akan muncul di Proyek Saya dan di Dashboard",
          "Buat Penawaran atau Proposal — dari Detail Proyek, dengan data client/proyek terisi otomatis",
          "Buat Invoice — ketika pekerjaan disetujui atau selesai dikirim",
        ] },
        { body: "Ini tidak wajib, kok — Anda juga bisa langsung membuka Generator Penawaran, Proposal, atau Invoice dan mengisi semuanya secara manual tanpa pernah menggunakan Kalkulator atau Proyek." },
        { body: "Daftar Harga dan Template berada di luar alur ini: Daftar Harga adalah dokumen daftar harga mandiri, dan Template adalah kumpulan item baris yang dapat digunakan kembali untuk dimasukkan ke Penawaran atau Invoice." },
      ],
    },
    {
      id: "data-storage",
      category: "Mulai",
      badge: "04",
      title: "Di Mana Data Anda Disimpan",
      desc: "Penyimpanan lokal browser — apa artinya bagi Anda",
      keywords: ["storage", "localstorage", "browser", "sync", "cloud", "backup", "lost", "hilang", "data hilang", "missing data", "clear cache", "incognito", "privasi"],
      related: ["backup-restore-guide", "settings-guide"],
      sections: [
        { body: "Setiap proyek, penawaran, proposal, invoice, daftar harga, template, dan profil bisnis Anda disimpan di penyimpanan lokal browser ini — bukan di server, dan bukan di cloud." },
        { heading: "Apa artinya dalam praktik", body: [
          "Data tidak otomatis tersinkronisasi antar perangkat — membuka aplikasi di browser atau perangkat lain akan dimulai dari kosong",
          "Menghapus data browser Anda dapat menghilangkan data aplikasi yang tersimpan",
          "Menggunakan browser atau perangkat yang berbeda tidak akan otomatis menampilkan data yang sama",
          "Jendela private/incognito mungkin tidak menyimpan data setelah Anda menutupnya",
          "Anda sebaiknya membuat cadangan secara rutin, karena ini satu-satunya cara memindahkan data antar perangkat atau memulihkannya jika terjadi sesuatu pada browser ini",
        ] },
        { body: "Lihat \"Cadangkan & Pulihkan Data Anda\" untuk cara mengunduh cadangan, dan bagian Data & Pemecahan Masalah di bawah untuk apa yang harus dilakukan jika ada yang tampak hilang." },
      ],
    },
    {
      id: "first-project",
      category: "Mulai",
      badge: "05",
      title: "Proyek Pertama Anda",
      desc: "Langkah demi langkah, dari harga hingga proyek tersimpan",
      keywords: ["first", "getting started", "new project"],
      related: ["pricing-calculator-guide", "my-projects-guide"],
      sections: [
        { heading: "Langkah-langkah", body: {
          steps: [
            "Buka Kalkulator Harga dari sidebar",
            "Isi Nama Proyek, Jenis Layanan, Estimasi Jam Kerja, dan Tarif per Jam",
            "Opsional, tambahkan Biaya Tambahan, Revisi yang Termasuk, dan Buffer Risiko / Margin Profit",
            "Perhatikan Harga yang Disarankan yang diperbarui secara langsung saat Anda mengetik",
            "Klik \"Simpan ke Proyek\"",
          ],
        } },
        { body: "Proyek sekarang muncul di Dashboard dan di Proyek Saya. Buka untuk mengatur nama Client, mengubah Status-nya, atau membuat Penawaran, Proposal, atau Invoice darinya." },
      ],
    },

    // ---- PANDUAN FITUR ----
    {
      id: "dashboard-guide",
      category: "Dashboard",
      badge: "dashboard",
      title: "Dashboard",
      desc: "Angka ringkasan Anda dan artinya",
      keywords: ["dashboard", "summary", "revenue", "home", "backup reminder"],
      related: ["my-projects-guide", "first-project", "backup-restore-guide"],
      sections: [
        { heading: "Kartu ringkasan", body: [
          "Total Proyek — jumlah setiap proyek yang telah Anda simpan",
          "Total Pendapatan — jumlah harga untuk proyek dengan status Disetujui atau Selesai saja (bukan semua proyek)",
          "Proposal Tertunda — jumlah proyek dengan status \"Proposal Terkirim\"",
          "Disetujui — jumlah proyek dengan status \"Disetujui\"",
        ] },
        { heading: "Pengingat Cadangan", body: "Jika Anda memiliki data tersimpan tetapi belum pernah mencadangkan, atau cadangan terakhir Anda sudah agak lama atau Anda telah membuat perubahan sejak itu, pengingat ringkas akan muncul di sini dengan tombol cadangkan satu klik. \"Ingatkan Nanti\" akan menyembunyikannya selama sekitar satu minggu. Lihat \"Cadangkan & Pulihkan Data Anda\" untuk detailnya." },
        { heading: "Panel Mendatang", body: "Menampilkan Penawaran dan Proposal terkirim yang mendekati tanggal Berlaku Hingga, plus Invoice terkirim atau terlambat yang mendekati tanggal Jatuh Tempo — beberapa yang paling dekat, atau kosong jika tidak ada." },
        { heading: "Proyek Terbaru", body: "Proyek yang paling baru diperbarui; klik baris untuk membuka Detail Proyeknya." },
        { heading: "Aksi Cepat", body: "Pintasan ke Kalkulator Harga, Generator Penawaran, Generator Proposal, dan Generator Invoice." },
        { body: "Jika Anda belum memiliki proyek, Dashboard akan menampilkan tampilan selamat datang dengan opsi \"Muat Data Contoh\" — ini membuat proyek contoh yang nyata, dapat diedit, dan dapat dihapus supaya Anda bisa melihat aplikasi ini bekerja; ini bukan data demo yang terkunci." },
      ],
    },
    {
      id: "pricing-calculator-guide",
      category: "Kalkulator Harga",
      badge: "calc",
      title: "Kalkulator Harga",
      desc: "Menghitung harga yang disarankan dari biaya Anda",
      keywords: ["calculator", "price", "harga", "margin", "buffer", "kalkulator"],
      related: ["first-project", "revision-calculator-guide", "my-projects-guide"],
      sections: [
        { body: "Gunakan ini untuk mengubah jam kerja, tarif, biaya, dan target margin Anda menjadi harga proyek yang disarankan." },
        { heading: "Kolom", body: [
          "Nama Proyek, Jenis Layanan",
          "Estimasi Jam Kerja, Tarif per Jam",
          "Biaya Tambahan",
          "Revisi yang Termasuk, Fee per Revisi Tambahan, Perkiraan Revisi Tambahan",
          "Buffer Risiko / Proyek (0–50%)",
          "Target Margin Profit (0–95%)",
        ] },
        { heading: "Membaca hasil", body: "Harga yang Disarankan diperbarui secara langsung saat Anda mengetik, beserta kisaran harga dan rincian lengkap (Biaya Tenaga Kerja, Biaya Tambahan, biaya Revisi Tambahan, Biaya Dasar, Buffer Risiko, Total Biaya, Profit, dan Margin Profit). Sebuah lencana kesehatan — Sehat, Margin Rendah, atau Risiko Tinggi — bereaksi terhadap pengaturan margin dan buffer Anda." },
        { heading: "Menyimpan", body: "\"Simpan ke Proyek\" menyimpan perhitungan ke Proyek Saya dan Dashboard. Jika Anda membuka Kalkulator untuk mengedit proyek yang sudah ada (melalui \"Edit Harga\"), tombolnya akan berbunyi \"Perbarui Proyek\" dan menyimpan perubahan kembali ke proyek yang sama." },
        { heading: "Atur Ulang", body: "Mengosongkan kembali formulir. Ini tidak menghapus apa pun yang sudah Anda simpan." },
      ],
    },
    {
      id: "revision-calculator-guide",
      category: "Kalkulator Revisi",
      badge: "revision",
      title: "Kalkulator Revisi",
      desc: "Pencarian cepat untuk biaya revisi tambahan",
      keywords: ["revision", "revisi"],
      related: ["pricing-calculator-guide"],
      sections: [
        { body: "Kalkulator cepat dan mandiri untuk menentukan biaya ketika client meminta revisi di luar yang sudah termasuk." },
        { heading: "Cara menggunakannya", body: "Opsional, pilih Proyek tersimpan dari dropdown untuk mengisi otomatis \"Fee per Revisi Tambahan\"-nya — atau biarkan pada Manual dan ketik sendiri. Masukkan fee dan jumlah revisi tambahan; totalnya akan diperbarui secara langsung." },
        { body: "Hasil ini tidak disimpan di mana pun — ini perhitungan cepat, bukan dokumen. \"Atur Ulang\" akan mengosongkan formulir." },
      ],
    },
    {
      id: "my-projects-guide",
      category: "Proyek Saya",
      badge: "projects",
      title: "Proyek Saya",
      desc: "Setiap proyek yang telah Anda simpan, dan Detail Proyek",
      keywords: ["projects", "project detail", "status"],
      related: ["pricing-calculator-guide", "quotation-guide", "dashboard-guide"],
      sections: [
        { body: "Menampilkan daftar setiap proyek yang disimpan dari Kalkulator Harga, dengan bilah ringkasan (Total Proyek, Total Estimasi Nilai, Terakhir Diperbarui)." },
        { heading: "Cari, filter, urutkan", body: "Pencarian mencocokkan nama proyek atau client. Filter berdasarkan status. Urutkan berdasarkan Terbaru Diperbarui, Terlama, Harga (tinggi–rendah atau rendah–tinggi), atau Nama A–Z." },
        { heading: "Aksi baris", body: ["Buka — melihat Detail Proyek", "Edit Harga — kembali ke Kalkulator, terisi otomatis", "Hapus — hanya menghapus proyek"] },
        { heading: "Detail Proyek", body: "Memungkinkan Anda mengedit nama Client langsung, mengubah Status, meninjau rincian harga lengkap, dan membuat atau membuka Penawaran, Proposal, atau Invoice mana pun yang sudah terhubung dengan proyek ini." },
        { heading: "Status", body: ["Draft", "Proposal Terkirim", "Disetujui", "Ditolak", "Selesai"], enum: true },
        { body: "Menghapus proyek tidak menghapus penawaran, proposal, atau invoice yang sudah dibuat darinya — semua itu tetap utuh." },
      ],
    },
    {
      id: "quotation-guide",
      category: "Penawaran",
      badge: "doc",
      title: "Generator Penawaran & Penawaran Saya",
      desc: "Penawaran harga sebelum proyek disepakati",
      keywords: ["quotation", "quote", "penawaran", "qt"],
      related: ["templates-guide", "my-projects-guide", "invoice-guide"],
      sections: [
        { body: "Penawaran adalah tawaran harga yang Anda kirim ke client sebelum proyek disepakati." },
        { heading: "Penomoran", body: "Setiap penawaran baru mendapat nomor otomatis seperti QT-202609-001 — tahun dan bulan, lalu urutan yang selalu melanjutkan dari nomor tertinggi yang tersimpan untuk bulan itu." },
        { heading: "Pengaturan awal", body: "Opsional, hubungkan dengan Proyek tersimpan (ini akan mengisi nama client dan satu item baris awal) atau biarkan pada \"Manual\" dan isi semuanya secara manual. Info Client (nama, perusahaan, email, telepon, alamat) dan Info Bisnis adalah kolom terpisah — Info Bisnis terisi otomatis dari Profil Bisnis Anda dan dapat diperbarui kapan saja dengan \"Gunakan Profil Bisnis Terbaru\", plus memiliki unggahan logo sendiri." },
        { heading: "Item", body: "Tambahkan item baris dengan deskripsi, jumlah, dan harga satuan — total akan dihitung ulang saat Anda mengetik. \"Muat dari Template\" memungkinkan Anda menambahkan item dari Template tersimpan dengan satu klik." },
        { heading: "Diskon, Pajak, Syarat", body: ["Diskon — Tidak Ada, Persentase, atau Jumlah Tetap", "Pajak — dalam persentase", "Syarat Pembayaran — 50/50, 100% di Muka, 30/70, atau Kustom", "Kolom teks Catatan dan Syarat & Ketentuan"] },
        { heading: "Menyimpan & PDF", body: "Indikator status simpan menunjukkan Perubahan belum disimpan vs Tersimpan. \"Simpan Penawaran\" memerlukan Nama Bisnis, Nama Client, dan minimal satu item. \"Ekspor PDF\" membuka dialog cetak browser Anda — pilih \"Simpan sebagai PDF\" sebagai tujuan." },
        { heading: "Penawaran Saya", body: "Cari, filter berdasarkan status, dan urutkan berdasarkan tanggal atau total. Setiap baris memungkinkan Anda mengubah Status langsung (Draft, Terkirim, Diterima, Ditolak, Kedaluwarsa), Membuka penawaran, Ekspor PDF, atau Menghapus." },
      ],
    },
    {
      id: "proposal-guide",
      category: "Proposal",
      badge: "doc",
      title: "Generator Proposal & Proposal Saya",
      desc: "Dokumen presentasi yang lebih lengkap dengan scope dan investasi",
      keywords: ["proposal", "pitch", "scope", "objectives", "deliverables", "timeline"],
      related: ["quotation-guide", "invoice-guide"],
      sections: [
        { body: "Proposal adalah dokumen presentasi yang lebih detail — overview, scope, dan investasi — digunakan untuk meyakinkan client, biasanya sebelum atau bersamaan dengan Penawaran." },
        { heading: "Penomoran", body: "Setiap proposal baru mendapat nomor otomatis seperti PR-202609-001, mengikuti aturan yang sama seperti Penawaran." },
        { heading: "Pengaturan awal", body: "Pola hubungan Proyek, Info Client, dan Info Bisnis yang sama seperti Penawaran, termasuk \"Gunakan Profil Bisnis Terbaru\" dan logo sendiri." },
        { heading: "Bagian konten", body: ["Overview", "Tujuan (daftar yang Anda susun)", "Scope of Work (daftar)", "Deliverables (daftar)", "Timeline (fase yang Anda tambahkan)", "Investasi Proyek — satu jumlah, bukan item baris terperinci", "Syarat Pembayaran (50/50, 100% di Muka, 30/70, atau Kustom)", "Langkah Selanjutnya", "Syarat & Ketentuan"], enum: true },
        { body: "Tidak ada diskon/pajak atau pemuatan Template item baris di sini — Investasi adalah satu angka yang Anda tentukan langsung, bukan dihitung dari item." },
        { heading: "Menyimpan & PDF", body: "\"Simpan Proposal\" atau \"Ekspor PDF\" (melalui dialog cetak browser Anda), sama seperti Penawaran." },
        { heading: "Proposal Saya", body: "Cari, filter berdasarkan status, dan urutkan berdasarkan tanggal, nilai, atau nama. Status langsung (Draft, Terkirim, Diterima, Ditolak), Buka, Ekspor PDF, atau Hapus." },
      ],
    },
    {
      id: "invoice-guide",
      category: "Invoice",
      badge: "doc",
      title: "Generator Invoice & Invoice Saya",
      desc: "Tagihan yang Anda kirim setelah pekerjaan disepakati",
      keywords: ["invoice", "tagihan", "bill", "payment", "due date", "qris", "bank"],
      related: ["quotation-guide", "templates-guide", "settings-guide"],
      sections: [
        { body: "Invoice adalah tagihan sesungguhnya yang Anda kirim setelah pekerjaan disepakati atau selesai dikirim." },
        { heading: "Penomoran", body: "Setiap invoice baru mendapat nomor otomatis seperti INV-202609-001, mengikuti aturan yang sama seperti Penawaran." },
        { heading: "Pengaturan awal", body: "Hubungan Proyek, Info Client, dan Info Bisnis mengikuti pola yang sama seperti Penawaran. Anda juga menentukan Tanggal Terbit dan Tanggal Jatuh Tempo." },
        { heading: "Item, diskon, pajak", body: "Item baris (deskripsi, jumlah, harga satuan), plus Diskon (Tidak Ada/Persentase/Tetap) dan Pajak (%), sama seperti Penawaran." },
        { heading: "Informasi pembayaran", body: "Metode Pembayaran (Transfer Bank, E-Wallet, Tunai, atau Lainnya), Nama Bank, Nama Rekening, Nomor Rekening, dan Instruksi Pembayaran — semua ini terisi otomatis dari Profil Bisnis Anda jika sudah disimpan di sana. Opsi Syarat Pembayaran adalah Jatuh tempo saat diterima, 7 hari, 14 hari, 30 hari, atau Kustom." },
        { heading: "Status", body: "Draft, Terkirim, Dibayar, Terlambat — diatur pada formulir itu sendiri atau diubah langsung dari Invoice Saya." },
        { heading: "Menyimpan & PDF", body: "\"Simpan Invoice\" atau \"Ekspor PDF\" melalui dialog cetak browser Anda, sama seperti generator lainnya." },
        { heading: "Invoice Saya", body: "Cari, filter berdasarkan status, urutkan berdasarkan tanggal atau total. Status langsung, Buka, Ekspor PDF, atau Hapus." },
        { body: "Catatan: Anda dapat mengunggah gambar QRIS di Pengaturan, tetapi gambar ini tidak dimasukkan ke invoice yang dihasilkan — detail pembayaran yang benar-benar muncul pada invoice adalah kolom bank/pembayaran yang disebutkan di atas." },
      ],
    },
    {
      id: "rate-cards-guide",
      category: "Daftar Harga",
      badge: "ratecard",
      title: "Daftar Harga & Daftar Harga Saya",
      desc: "Daftar harga mandiri yang dapat dicetak",
      keywords: ["rate card", "price list", "services", "harga jasa"],
      related: ["templates-guide"],
      sections: [
        { body: "Daftar Harga adalah dokumen mandiri yang mencantumkan harga layanan Anda — untuk membagikan tarif standar Anda ke client. Tidak terikat pada kesepakatan tertentu, dan tidak masuk ke Penawaran atau Invoice." },
        { heading: "Membuatnya", body: "Isi Info Bisnis Anda (nama, logo, kontak), tambahkan Layanan (deskripsi, harga, dan unit seperti \"/jam\" atau \"/proyek\"), Catatan opsional, dan rentang tanggal Berlaku Dari/Hingga opsional." },
        { heading: "Menyimpan & PDF", body: "\"Simpan Daftar Harga\" atau \"Ekspor PDF\" melalui dialog cetak browser Anda." },
        { heading: "Daftar Harga Saya", body: "Bilah ringkasan (Total Daftar Harga, Total Layanan, Rata-rata Tarif), pencarian, pengurutan, dan aksi baris: Buka, Ekspor PDF, Hapus." },
        { body: "Jika Anda menginginkan item yang dapat digunakan kembali dan dimasukkan langsung ke Penawaran atau Invoice, gunakan Template — lihat \"Daftar Harga vs Template\" di bawah." },
      ],
    },
    {
      id: "templates-guide",
      category: "Template",
      badge: "template",
      title: "Template",
      desc: "Item baris yang dapat digunakan kembali untuk dimasukkan ke dokumen",
      keywords: ["template", "reusable items", "load from template"],
      related: ["rate-cards-guide", "quotation-guide", "invoice-guide"],
      sections: [
        { body: "Template adalah kumpulan item baris (deskripsi, jumlah, harga satuan) yang tersimpan dan dapat digunakan kembali untuk dimasukkan ke Penawaran atau Invoice — inilah yang membedakannya dari Daftar Harga (lihat di bawah)." },
        { heading: "Membuatnya", body: "Klik \"+ Template Baru\", beri nama, tambahkan item dengan jumlah dan harga, lalu Simpan." },
        { heading: "Menggunakannya", body: "Dari daftar Template, setiap baris memiliki menu \"•••\" dengan \"Gunakan di Penawaran\" atau \"Gunakan di Invoice\" — ini akan menambahkan item template ke generator mana pun yang Anda pilih, tanpa mengubah template tersimpan itu sendiri. Anda juga bisa memuat template langsung dari dalam Generator Penawaran atau Invoice, melalui dropdown \"Muat dari Template\" mereka." },
        { heading: "Mengelola template", body: "Cari berdasarkan nama atau item, urutkan berdasarkan terbaru diperbarui/terlama/nama. Aksi baris: Edit, Duplikat, Hapus." },
        { heading: "Daftar Harga vs Template", body: "Daftar Harga adalah dokumen mandiri yang Anda berikan ke client — sebuah daftar harga. Template adalah kumpulan item baris yang Anda masukkan ke Penawaran atau Invoice yang sedang Anda buat. Keduanya disimpan dan dikelola secara terpisah." },
      ],
    },
    {
      id: "settings-guide",
      category: "Pengaturan",
      badge: "settings",
      title: "Pengaturan & Profil Bisnis",
      desc: "Satu profil yang mengisi otomatis setiap dokumen baru",
      keywords: ["settings", "business profile", "currency", "tax default", "reset profile", "data management", "backup", "clear all data"],
      related: ["business-profile-setup", "backup-restore-guide", "quotation-guide"],
      sections: [
        { body: "Pengaturan menyimpan satu Profil Bisnis bersama yang digunakan untuk mengisi otomatis setiap Penawaran, Proposal, dan Invoice baru." },
        { heading: "Kolom", body: ["Nama Bisnis*, Tagline, Nama Pemilik (* = wajib, beserta Email dan Telepon)", "Email*, Telepon*, Website, Instagram", "Alamat, Kota, Negara, Logo", "Metode Pembayaran, Nama Bank, Nama Rekening, Nomor Rekening, Instruksi Pembayaran", "Gambar QRIS (disimpan ke profil Anda; belum ditampilkan pada dokumen yang dihasilkan)", "% Pajak Default, hari \"Berlaku Hingga\" Default, Syarat Pembayaran Default — diterapkan ke Penawaran baru", "Mata Uang — tetap ke IDR"] },
        { heading: "Menyimpan", body: "Indikator status simpan menunjukkan Perubahan belum disimpan vs Perubahan tersimpan, pola yang sama seperti generator dokumen." },
        { heading: "Atur Ulang", body: "Menghapus seluruh profil bisnis tersimpan Anda — bukan hanya defaultnya. Proyek, penawaran, proposal, dan invoice yang sudah Anda buat tidak terpengaruh." },
        { heading: "Penting: dokumen adalah snapshot", body: "Mengubah Profil Bisnis Anda tidak akan memperbarui dokumen yang sudah Anda simpan secara retroaktif — setiap dokumen menyimpan info bisnis yang berlaku saat dibuat. Untuk mengambil info profil terbaru ke dokumen yang sudah ada, buka dokumen itu dan klik \"Gunakan Profil Bisnis Terbaru\"." },
        { body: "Pengaturan juga memiliki bagian \"Data & Cadangan\" untuk mengunduh cadangan, memulihkan dari file cadangan, dan menghapus semua data aplikasi — lihat \"Cadangkan & Pulihkan Data Anda\" di bawah." },
      ],
    },
    {
      id: "backup-restore-guide",
      category: "Cadangkan & Pulihkan",
      badge: "storage",
      title: "Cadangkan & Pulihkan Data Anda",
      desc: "Unduh, pulihkan, dan hapus data yang tersimpan secara lokal",
      keywords: ["backup", "restore", "download backup", "restore backup", "clear all data", "delete everything", "last backup created", "json", "export", "import", "another device", "move data"],
      related: ["data-storage", "settings-guide", "dashboard-guide"],
      sections: [
        { body: "Karena semuanya disimpan secara lokal di browser Anda (lihat \"Di Mana Data Anda Disimpan\"), cadangan adalah cara untuk melindungi pekerjaan Anda dan memindahkannya antar perangkat. Cadangkan & Pulihkan berada di Pengaturan, di bagian \"Data & Cadangan\"." },
        { heading: "Apa yang dicadangkan", body: ["Profil Bisnis", "Proyek", "Penawaran", "Proposal", "Invoice", "Daftar Harga", "Template"], enum: true },
        { heading: "Cara membuat cadangan", body: {
          steps: [
            "Buka Pengaturan",
            "Temukan bagian \"Data & Cadangan\"",
            "Klik \"Unduh Cadangan\"",
            "Browser Anda akan mengunduh file JSON (bernama seperti freelance-kit-backup-2026-09-03.json)",
            "Simpan file itu di tempat yang aman — komputer Anda, drive eksternal, atau penyimpanan cloud Anda sendiri seperti Google Drive",
          ],
        } },
        { body: "Aplikasi ini tidak mengunggah file ini ke mana pun dengan sendirinya — menyimpannya di tempat yang aman (termasuk ke penyimpanan cloud Anda sendiri, jika Anda memilih) adalah tanggung jawab Anda." },
        { heading: "\"Cadangan terakhir dibuat\"", body: "Pengaturan dan Dashboard sama-sama menampilkan kapan terakhir kali Anda mengunduh cadangan. Ini hanya berarti sebuah cadangan berhasil dibuat dan diunduh — aplikasi tidak memiliki cara untuk memastikan file itu masih ada setelahnya, jadi dengan sengaja tidak pernah mengklaim data Anda \"tercadangkan dengan aman.\"" },
        { heading: "Pengingat Cadangan di Dashboard", body: "Jika Anda memiliki data tersimpan tetapi belum ada cadangan, atau cadangan terakhir Anda sudah 14+ hari atau Anda telah membuat perubahan sejak itu, Dashboard akan menampilkan pengingat ringkas dengan tombol \"Cadangkan Sekarang\" / \"Buat Cadangan Baru\". \"Ingatkan Nanti\" akan menyembunyikannya selama sekitar satu minggu. Pengingat ini hanya dorongan — tidak ada yang dicadangkan secara otomatis; Anda tetap membuat cadangan secara manual." },
        { heading: "Cara memulihkan dari cadangan", body: {
          steps: [
            "Buka Pengaturan dan temukan \"Data & Cadangan\"",
            "Klik \"Pilih File Cadangan\" dan pilih file cadangan .json yang sebelumnya diunduh",
            "Tinjau pratinjaunya — ini menampilkan tanggal cadangan yang sebenarnya dan berapa banyak Proyek, Penawaran, Proposal, Invoice, Daftar Harga, dan Template yang dikandungnya",
            "Klik \"Pulihkan Data\"",
            "Konfirmasi pada dialog yang muncul (ini menampilkan tanggal cadangan sekali lagi)",
          ],
        } },
        { heading: "Memulihkan menggantikan data Anda saat ini", body: "Ini penting: memulihkan tidak menggabungkan atau menambahkan ke apa yang sudah Anda miliki — ini menggantikannya. Misalnya, jika Anda saat ini memiliki 10 proyek dan memulihkan cadangan yang berisi 5, Anda akan berakhir dengan 5 proyek itu, bukan 15. Pastikan pekerjaan yang lebih baru sudah dicadangkan terlebih dahulu jika Anda tidak ingin kehilangannya." },
        { heading: "Validasi cadangan", body: "Sebelum memulihkan apa pun, aplikasi memeriksa bahwa file tersebut adalah JSON yang valid, milik aplikasi ini, menggunakan versi cadangan yang didukung, dan memiliki struktur data yang valid. Jika ada pemeriksaan yang gagal, Anda akan melihat error yang jelas dan data Anda saat ini dibiarkan sepenuhnya tidak berubah." },
        { heading: "Hapus Semua Data", body: "Zona Berbahaya di Pengaturan juga memiliki \"Hapus Semua Data,\" yang menghapus secara permanen hanya data tersimpan milik aplikasi ini (proyek, dokumen, daftar harga, template, dan profil bisnis) dari browser ini — ini tidak menyentuh data website atau aplikasi lain. Ini memerlukan mengetik DELETE untuk konfirmasi dan tidak dapat dibatalkan, jadi sebaiknya unduh cadangan terlebih dahulu; jika Anda pernah membutuhkan data itu kembali, memulihkan cadangan akan mengembalikannya." },
      ],
    },
  ];

  const ARTICLES = getAppLanguage() === "id" ? ARTICLES_ID : ARTICLES_EN;

  // Category display order for the "All Feature Guides" grid (Getting
  // Started articles are shown separately, above this grid).
  const GUIDE_IDS = [
    "dashboard-guide", "pricing-calculator-guide", "revision-calculator-guide",
    "my-projects-guide", "quotation-guide", "proposal-guide", "invoice-guide",
    "rate-cards-guide", "templates-guide", "settings-guide", "backup-restore-guide",
  ];

  const FAQ_ITEMS_EN = [
    { q: "Where is my data stored?", a: "Locally, in this browser's storage — not on a server and not in the cloud. It stays on this device and this browser unless you back it up and restore it elsewhere.", keywords: ["storage", "where", "local"] },
    { q: "Can I use my backup on another device?", a: "Yes — that's exactly what backups are for. Download a backup from this device (Settings \u2192 Data & Backup), then open the app on the other device and restore that same file there.", keywords: ["another device", "multiple devices", "move data", "sync"] },
    { q: "Does the app automatically back up my data?", a: "No. Backups only happen when you click \"Download Backup\" yourself. The Dashboard may remind you to do this, but nothing is backed up automatically.", keywords: ["automatic backup", "auto backup", "cloud sync"] },
    { q: "How do I create a backup?", a: "Go to Settings \u2192 Data & Backup and click \"Download Backup.\" It downloads a JSON file — save that file somewhere safe.", keywords: ["create backup", "download backup", "how to backup"] },
    { q: "How do I restore my data?", a: "Go to Settings \u2192 Data & Backup, choose your backup file, review the preview, then confirm Restore Data. This replaces your current data with what's in the backup.", keywords: ["restore", "restore backup", "how to restore"] },
    { q: "Will restoring a backup replace my current data?", a: "Yes — restoring replaces your current data with the backup's data; it doesn't merge the two. Anything not in the backup (added after it was made) will be gone unless you have a newer backup.", keywords: ["restore replace", "overwrite", "merge"] },
    { q: "What does \"Last Backup Created\" mean?", a: "The date and time you last successfully downloaded a backup. It doesn't mean your data is currently safe — the app can't know whether that downloaded file still exists — so back up again whenever you've made changes worth keeping.", keywords: ["last backup created", "backup date"] },
    { q: "How do I delete all my app data?", a: "Settings \u2192 Data & Backup \u2192 Danger Zone \u2192 Clear All Data. It only removes this app's own saved data, requires typing DELETE to confirm, and can't be undone \u2014 back up first if you might want the data later.", keywords: ["delete all data", "clear all data", "wipe", "reset app"] },
    { q: "Do I need to back up often?", a: "Whenever you've added or changed something you'd be upset to lose. The Dashboard's backup reminder will nudge you if it's been a while or you have unbacked-up changes.", keywords: ["how often", "backup often", "regularly"] },
    { q: "Can I edit a saved document?", a: "Yes. Quotations, Proposals, Invoices, Rate Cards, and Templates can all be reopened (Open/Edit from their list page) and saved again with changes.", keywords: ["edit", "update"] },
    { q: "Can I delete a project?", a: "Yes, from My Projects' row menu or from Project Detail. Deleting a project does not delete any quotations, proposals, or invoices already created from it.", keywords: ["delete project"] },
    { q: "What is the difference between a Rate Card and a Template?", a: "A Rate Card is a standalone, printable price-list document you share with a client. A Template is a reusable bundle of line items you insert into a Quotation or Invoice you're building.", keywords: ["rate card vs template", "difference"] },
    { q: "Can I print a document as PDF?", a: "Yes. \"Export PDF\" on any generator page opens your browser's print dialog — choose \"Save as PDF\" as the destination.", keywords: ["pdf", "print", "download"] },
    { q: "Do I need to create an account?", a: "No. There's no login or sign-up — the app runs entirely in your browser.", keywords: ["account", "login", "sign up", "akun"] },
  ];

  const FAQ_ITEMS_ID = [
    { q: "Di mana data saya disimpan?", a: "Secara lokal, di penyimpanan browser ini \u2014 bukan di server dan bukan di cloud. Data tetap berada di perangkat dan browser ini kecuali Anda mencadangkannya dan memulihkannya di tempat lain.", keywords: ["penyimpanan", "dimana", "lokal"] },
    { q: "Bisakah saya menggunakan cadangan saya di perangkat lain?", a: "Bisa \u2014 itu memang tujuan dari cadangan. Unduh cadangan dari perangkat ini (Pengaturan \u2192 Data & Cadangan), lalu buka aplikasi di perangkat lain dan pulihkan file yang sama di sana.", keywords: ["perangkat lain", "beberapa perangkat", "pindah data", "sinkron"] },
    { q: "Apakah aplikasi mencadangkan data saya secara otomatis?", a: "Tidak. Pencadangan hanya terjadi saat Anda mengklik \"Unduh Cadangan\" sendiri. Dashboard mungkin mengingatkan Anda untuk melakukannya, tapi tidak ada yang dicadangkan secara otomatis.", keywords: ["cadangan otomatis", "auto backup", "sinkronisasi cloud"] },
    { q: "Bagaimana cara membuat cadangan?", a: "Buka Pengaturan \u2192 Data & Cadangan dan klik \"Unduh Cadangan.\" File JSON akan terunduh \u2014 simpan file itu di tempat yang aman.", keywords: ["buat cadangan", "unduh cadangan", "cara mencadangkan"] },
    { q: "Bagaimana cara memulihkan data saya?", a: "Buka Pengaturan \u2192 Data & Cadangan, pilih file cadangan Anda, tinjau pratinjaunya, lalu konfirmasi Pulihkan Data. Ini akan menggantikan data Anda saat ini dengan data dari cadangan.", keywords: ["pulihkan", "pulihkan cadangan", "cara memulihkan"] },
    { q: "Apakah memulihkan cadangan akan mengganti data saya saat ini?", a: "Ya \u2014 memulihkan akan mengganti data Anda saat ini dengan data dari cadangan; tidak menggabungkan keduanya. Apa pun yang tidak ada di cadangan (ditambahkan setelah cadangan dibuat) akan hilang kecuali Anda memiliki cadangan yang lebih baru.", keywords: ["pulihkan ganti", "menimpa", "gabung"] },
    { q: "Apa arti \"Cadangan Terakhir Dibuat\"?", a: "Tanggal dan waktu terakhir Anda berhasil mengunduh cadangan. Ini tidak berarti data Anda saat ini aman \u2014 aplikasi tidak dapat mengetahui apakah file yang diunduh itu masih ada \u2014 jadi cadangkan lagi kapan pun Anda membuat perubahan yang berharga untuk disimpan.", keywords: ["cadangan terakhir dibuat", "tanggal cadangan"] },
    { q: "Bagaimana cara menghapus semua data aplikasi saya?", a: "Pengaturan \u2192 Data & Cadangan \u2192 Zona Berbahaya \u2192 Hapus Semua Data. Ini hanya menghapus data yang tersimpan milik aplikasi ini, memerlukan mengetik DELETE untuk konfirmasi, dan tidak dapat dibatalkan \u2014 cadangkan dulu jika Anda mungkin membutuhkan data itu nanti.", keywords: ["hapus semua data", "hapus semua data", "wipe", "reset aplikasi"] },
    { q: "Apakah saya perlu mencadangkan secara rutin?", a: "Kapan pun Anda menambah atau mengubah sesuatu yang akan Anda sesali jika hilang. Pengingat cadangan di Dashboard akan mengingatkan Anda jika sudah lama atau ada perubahan yang belum dicadangkan.", keywords: ["seberapa sering", "cadangan rutin", "berkala"] },
    { q: "Bisakah saya mengedit dokumen yang tersimpan?", a: "Bisa. Penawaran, Proposal, Invoice, Daftar Harga, dan Template semuanya dapat dibuka kembali (Buka/Edit dari halaman daftarnya) dan disimpan lagi dengan perubahan.", keywords: ["edit", "perbarui"] },
    { q: "Bisakah saya menghapus proyek?", a: "Bisa, dari menu baris di Proyek Saya atau dari Detail Proyek. Menghapus proyek tidak menghapus penawaran, proposal, atau invoice yang sudah dibuat darinya.", keywords: ["hapus proyek"] },
    { q: "Apa perbedaan antara Daftar Harga dan Template?", a: "Daftar Harga adalah dokumen daftar harga mandiri yang dapat dicetak dan dibagikan ke client. Template adalah kumpulan item baris yang dapat digunakan kembali untuk dimasukkan ke Penawaran atau Invoice yang sedang Anda buat.", keywords: ["daftar harga vs template", "perbedaan"] },
    { q: "Bisakah saya mencetak dokumen sebagai PDF?", a: "Bisa. \"Ekspor PDF\" pada halaman generator mana pun akan membuka dialog cetak browser Anda \u2014 pilih \"Simpan sebagai PDF\" sebagai tujuan.", keywords: ["pdf", "cetak", "unduh"] },
    { q: "Apakah saya perlu membuat akun?", a: "Tidak. Tidak ada login atau pendaftaran \u2014 aplikasi berjalan sepenuhnya di browser Anda.", keywords: ["akun", "login", "daftar", "akun"] },
  ];

  const TROUBLESHOOTING_ITEMS_EN = [
    { q: "Why are my changes not showing?", a: "Check the save-status indicator near the Save button — edits aren't stored until you click Save/Update. It reads \"Unsaved changes\" until you save.", keywords: ["not saving", "changes not showing"] },
    { q: "Why is my saved document missing?", a: "Most likely your browser's site data was cleared, or you're looking in a different browser, device, or profile — data never leaves the browser it was saved in. If you have a backup file, restoring it will bring back what's in that backup.", keywords: ["missing", "hilang", "document missing", "data hilang", "recover", "restore"] },
    { q: "How do I print or save as PDF?", a: "Click \"Export PDF\" on any generator page. Your browser's print dialog opens — pick \"Save as PDF\" as the destination.", keywords: ["print", "pdf", "save as pdf"] },
    { q: "Why is my Business Profile information missing on a document?", a: "Your Business Profile probably wasn't filled in Settings yet when the document was created. Fill it in Settings, then open the document and click \"Use latest Business Profile\".", keywords: ["business profile missing", "empty business info"] },
    { q: "Why can't I save changes?", a: "Check the message shown just above the Save button — it lists exactly which required field is missing (e.g. Business Name, Client Name, or at least one item).", keywords: ["can't save", "validation"] },
    { q: "Why is my document number different than I expected?", a: "Numbers follow the highest existing number for that year and month, plus one (e.g. QT-202609-003). They're never renumbered — if the highest-numbered document is deleted, the next one you create can reuse that number.", keywords: ["document number", "numbering", "qt", "inv", "pr"] },
    { q: "How do I delete saved data?", a: "To remove one item, use its own Delete action (every project, quotation, proposal, invoice, rate card, and template has one). To remove everything this app has saved at once, use Settings \u2192 Data & Backup \u2192 Danger Zone \u2192 Clear All Data — it only affects this app's data, not anything else in your browser. Consider downloading a backup first.", keywords: ["delete data", "clear data", "wipe", "clear all data"] },
    { q: "How do I reset the calculator?", a: "Click \"Reset\" on the Pricing Calculator to clear the form back to empty. This doesn't delete any project you've already saved.", keywords: ["reset calculator"] },
  ];

  const TROUBLESHOOTING_ITEMS_ID = [
    { q: "Mengapa perubahan saya tidak muncul?", a: "Periksa indikator status simpan di dekat tombol Simpan \u2014 perubahan tidak tersimpan sampai Anda mengklik Simpan/Perbarui. Tulisannya \"Perubahan belum disimpan\" sampai Anda menyimpannya.", keywords: ["tidak tersimpan", "perubahan tidak muncul"] },
    { q: "Mengapa dokumen tersimpan saya hilang?", a: "Kemungkinan besar data situs browser Anda telah dihapus, atau Anda sedang melihat di browser, perangkat, atau profil yang berbeda \u2014 data tidak pernah berpindah dari browser tempat data itu disimpan. Jika Anda punya file cadangan, memulihkannya akan mengembalikan apa yang ada di cadangan itu.", keywords: ["hilang", "dokumen hilang", "data hilang", "pulihkan", "restore"] },
    { q: "Bagaimana cara mencetak atau menyimpan sebagai PDF?", a: "Klik \"Ekspor PDF\" pada halaman generator mana pun. Dialog cetak browser Anda akan terbuka \u2014 pilih \"Simpan sebagai PDF\" sebagai tujuan.", keywords: ["cetak", "pdf", "simpan sebagai pdf"] },
    { q: "Mengapa informasi Profil Bisnis saya hilang pada dokumen?", a: "Profil Bisnis Anda kemungkinan belum diisi di Pengaturan saat dokumen ini dibuat. Isi di Pengaturan, lalu buka dokumen tersebut dan klik \"Gunakan Profil Bisnis Terbaru\".", keywords: ["profil bisnis hilang", "info bisnis kosong"] },
    { q: "Mengapa saya tidak bisa menyimpan perubahan?", a: "Periksa pesan yang muncul tepat di atas tombol Simpan \u2014 pesan itu menunjukkan persis kolom wajib mana yang belum diisi (misalnya Nama Bisnis, Nama Client, atau minimal satu item).", keywords: ["tidak bisa simpan", "validasi"] },
    { q: "Mengapa nomor dokumen saya berbeda dari yang saya harapkan?", a: "Nomor mengikuti nomor tertinggi yang sudah ada untuk tahun dan bulan itu, ditambah satu (misalnya QT-202609-003). Nomor tidak pernah diubah ulang \u2014 jika dokumen dengan nomor tertinggi dihapus, dokumen berikutnya yang Anda buat bisa menggunakan kembali nomor itu.", keywords: ["nomor dokumen", "penomoran", "qt", "inv", "pr"] },
    { q: "Bagaimana cara menghapus data yang tersimpan?", a: "Untuk menghapus satu item, gunakan aksi Hapus miliknya sendiri (setiap proyek, penawaran, proposal, invoice, daftar harga, dan template memilikinya). Untuk menghapus semua yang tersimpan aplikasi ini sekaligus, gunakan Pengaturan \u2192 Data & Cadangan \u2192 Zona Berbahaya \u2192 Hapus Semua Data \u2014 ini hanya memengaruhi data aplikasi ini, bukan hal lain di browser Anda. Pertimbangkan untuk mengunduh cadangan terlebih dahulu.", keywords: ["hapus data", "hapus data", "wipe", "hapus semua data"] },
    { q: "Bagaimana cara mereset kalkulator?", a: "Klik \"Atur Ulang\" pada Kalkulator Harga untuk mengosongkan formulir kembali. Ini tidak menghapus proyek yang sudah Anda simpan.", keywords: ["reset kalkulator"] },
  ];

  const FAQ_ITEMS = getAppLanguage() === "id" ? FAQ_ITEMS_ID : FAQ_ITEMS_EN;
  const TROUBLESHOOTING_ITEMS = getAppLanguage() === "id" ? TROUBLESHOOTING_ITEMS_ID : TROUBLESHOOTING_ITEMS_EN;

  /* ---------------------------------------------------------------------
     SEARCH INDEX — flattens articles + FAQ + troubleshooting into one
     searchable list, matched against title/question, keywords, and
     section/answer text.
     --------------------------------------------------------------------- */

  function articleText(article) {
    return article.sections.map((s) => {
      const body = s.body;
      if (Array.isArray(body)) return body.join(" ");
      if (body && body.steps) return body.steps.join(" ");
      return body || "";
    }).join(" ");
  }

  function buildSearchIndex() {
    const index = [];
    ARTICLES.forEach((a) => {
      index.push({
        type: "article", id: a.id, category: a.category, title: a.title,
        snippet: a.desc,
        haystack: [a.title, a.category, a.desc, (a.keywords || []).join(" "), articleText(a)].join(" ").toLowerCase(),
      });
    });
    FAQ_ITEMS.forEach((f, i) => {
      index.push({
        type: "faq", id: "faq-" + i, category: t("help.faq"), title: f.q,
        snippet: f.a,
        haystack: [f.q, f.a, (f.keywords || []).join(" ")].join(" ").toLowerCase(),
      });
    });
    TROUBLESHOOTING_ITEMS.forEach((item, i) => {
      index.push({
        type: "troubleshooting", id: "ts-" + i, category: t("help.category.troubleshooting"), title: item.q,
        snippet: item.a,
        haystack: [item.q, item.a, (item.keywords || []).join(" ")].join(" ").toLowerCase(),
      });
    });
    return index;
  }

  const SEARCH_INDEX = buildSearchIndex();

  function getArticleById(id) {
    return ARTICLES.find((a) => a.id === id) || null;
  }

  /* ---------------------------------------------------------------------
     RENDERING
     --------------------------------------------------------------------- */

  function renderArticleBlock(section) {
    const heading = section.heading ? `<p class="help-article-heading">${escapeHtml(section.heading)}</p>` : "";
    let body = "";
    if (Array.isArray(section.body)) {
      const items = section.body.map((li) => escapeHtml(li).trim());
      let sentence;
      if (section.enum) {
        // Short parallel labels (statuses, what's included, etc.) read
        // as a normal comma-separated list in a sentence: "A, B, C, and D."
        sentence = items.length > 1
          ? items.slice(0, -1).join(", ") + (items.length > 2 ? ", and " : " and ") + items[items.length - 1] + "."
          : items[0] + ".";
      } else {
        // Longer explanatory items were already written as short,
        // self-contained clauses — ending each with a period and
        // running them together as sentences reads naturally without
        // changing what they say.
        sentence = items.map((li) => (/[.!?]$/.test(li) ? li : li + ".")).join(" ");
      }
      body = `<p>${sentence}</p>`;
    } else if (section.body && section.body.steps) {
      body = `<ol>${section.body.steps.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ol>`;
    } else {
      body = `<p>${escapeHtml(section.body)}</p>`;
    }
    return `<div class="help-article-block">${heading}${body}</div>`;
  }

  function renderArticleView(id) {
    const article = getArticleById(id);
    if (!article) { renderHome(); return; }

    const related = (article.related || [])
      .map((rid) => getArticleById(rid))
      .filter(Boolean);

    contentEl.innerHTML = `
      <button type="button" class="help-article-back" data-help-back>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M8.5 3 4 7l4.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${t("help.backToHelp")}
      </button>
      <span class="help-article-category">${escapeHtml(article.category)}</span>
      <h2 class="help-article-title">${escapeHtml(article.title)}</h2>
      ${article.sections.map(renderArticleBlock).join("")}
      ${related.length ? `
        <div class="help-article-related">
          <p class="help-article-related-title">${t("help.relatedArticles")}</p>
          ${related.map((r) => `<button type="button" class="help-related-link" data-help-open-article="${r.id}">${escapeHtml(r.title)}</button>`).join("")}
        </div>
      ` : ""}
    `;

    contentEl.querySelector('[data-help-back]').addEventListener("click", () => {
      searchInput.value = "";
      renderHome();
    });
    contentEl.querySelectorAll('[data-help-open-article]').forEach((btn) => {
      btn.addEventListener("click", () => renderArticleView(btn.dataset.helpOpenArticle));
    });
    if (typeof contentEl.scrollIntoView === "function") {
      contentEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function wireFaqAccordion(container) {
    container.querySelectorAll('[data-help-toggle]').forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".help-item").classList.toggle("is-open");
      });
    });
  }

  function faqItemHTML(q, a) {
    return `
      <div class="help-item">
        <button class="help-question" type="button" data-help-toggle>
          <span class="help-question-text">${escapeHtml(q)}</span>
          <svg class="help-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.3 7 8.7l3.5-3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <p class="help-answer">${a}</p>
      </div>`;
  }

  function renderHome() {
    // Derived from GUIDE_IDS (which explicitly enumerates every non-
    // "Getting Started" article by id) rather than matching the
    // category string — the category label is translated per
    // language, but article ids and GUIDE_IDS are stable identifiers
    // that never change with the active language.
    const gettingStarted = ARTICLES.filter((a) => !GUIDE_IDS.includes(a.id));
    const guides = GUIDE_IDS.map(getArticleById).filter(Boolean);

    contentEl.innerHTML = `
      <div class="help-section">
        <h3 class="help-section-title">${t("help.gettingStarted")}</h3>
        <div class="help-tile-grid">
          ${gettingStarted.map((a) => `
            <button type="button" class="help-tile" data-help-open-article="${a.id}">
              <span class="help-tile-badge">${a.badge}</span>
              <span class="help-tile-text">
                <span class="help-tile-title">${escapeHtml(a.title)}</span>
                <span class="help-tile-desc">${escapeHtml(a.desc)}</span>
              </span>
              <span class="help-tile-arrow">\u203a</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="help-section">
        <h3 class="help-section-title">${t("help.allFeatureGuides")}</h3>
        <div class="help-tile-grid">
          ${guides.map((a) => `
            <button type="button" class="help-tile" data-help-open-article="${a.id}">
              <span class="help-tile-badge">${tileIcon(a.badge)}</span>
              <span class="help-tile-text">
                <span class="help-tile-title">${escapeHtml(a.title)}</span>
                <span class="help-tile-desc">${escapeHtml(a.desc)}</span>
              </span>
              <span class="help-tile-arrow">\u203a</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="help-section">
        <h3 class="help-section-title">${t("help.faq")}</h3>
        <div class="calc-card calc-form-card">
          ${FAQ_ITEMS.map((f) => faqItemHTML(f.q, f.a)).join("")}
        </div>
      </div>

      <div class="help-section">
        <h3 class="help-section-title">${t("help.dataAndTroubleshooting")}</h3>
        <div class="calc-card help-data-card">
          <p><strong>${t("help.dataStored.title")}</strong></p>
          <p>${t("help.dataStored.text")}</p>
        </div>
        <div class="calc-card calc-form-card">
          ${TROUBLESHOOTING_ITEMS.map((item) => faqItemHTML(item.q, item.a)).join("")}
        </div>
      </div>
    `;

    contentEl.querySelectorAll('[data-help-open-article]').forEach((btn) => {
      btn.addEventListener("click", () => renderArticleView(btn.dataset.helpOpenArticle));
    });
    wireFaqAccordion(contentEl);
  }

  function renderSearchResults(query) {
    const term = query.trim().toLowerCase();
    const results = SEARCH_INDEX.filter((entry) => entry.haystack.includes(term));

    if (!results.length) {
      contentEl.innerHTML = `<p class="help-empty-search">${t("help.noResultsFor", { query: escapeHtml(query) })}</p>`;
      return;
    }

    contentEl.innerHTML = `
      <div class="help-section">
        <h3 class="help-section-title">${t(results.length === 1 ? "help.resultsFor.one" : "help.resultsFor.other", { n: results.length, query: escapeHtml(query) })}</h3>
        ${results.map((r) => {
          if (r.type === "article") {
            return `
              <button type="button" class="help-result-card" data-help-open-article="${r.id}">
                <span class="help-result-category">${escapeHtml(r.category)}</span>
                <p class="help-result-title">${escapeHtml(r.title)}</p>
                <p class="help-result-snippet">${escapeHtml(r.snippet)}</p>
              </button>`;
          }
          return `
            <div class="help-result-card is-static">
              <span class="help-result-category">${escapeHtml(r.category)}</span>
              <p class="help-result-title">${escapeHtml(r.title)}</p>
              <p class="help-result-snippet">${r.snippet}</p>
            </div>`;
        }).join("")}
      </div>
    `;

    contentEl.querySelectorAll('[data-help-open-article]').forEach((btn) => {
      btn.addEventListener("click", () => renderArticleView(btn.dataset.helpOpenArticle));
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value;
      if (q.trim()) {
        renderSearchResults(q);
      } else {
        renderHome();
      }
    });
  }

  window.FreelanceHelp = { goHome: renderHome };

  renderHome();
}
