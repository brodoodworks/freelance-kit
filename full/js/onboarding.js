/* ==========================================================================
   ONBOARDING.JS
   First-run welcome screen + a short guided tour. Runs once per browser
   (gated by localStorage, same pattern as the install-prompt banner) and
   does nothing at all on every later visit — zero DOM, zero cost.

   Flow:
   1. Full-screen welcome screen, two columns:
      - Left: what this package actually does (package-aware copy).
      - Right: "sign up with email" CTA (reuses the existing Sync login
        modal from sync.js — no separate auth code here) with a clearly
        visible "skip, use offline" option, since the app works fully
        without an account and that should never feel hidden or like a
        dead end.
   2. Once the welcome screen is dismissed (signed up, cancelled, or
      skipped — all three end the same way), a short step-by-step tour
      walks through the pages this package actually has, using the app's
      own navigateTo() so the person sees the real page, not a mockup.

   Depends on: window.FreelanceKitPackage (package.js), navigateTo/t/
   getAppLanguage (app.js/i18n.js), optionally window.__freelanceOpenSyncLogin
   (sync.js, only defined when sync is configured) — every dependency is
   checked before use, so this file degrades gracefully if any is missing.
   ========================================================================== */

(function () {
  const ONBOARD_KEY = "freelance-kit-onboarded";
  try {
    if (localStorage.getItem(ONBOARD_KEY) === "1") return;
  } catch (err) {
    return; // no localStorage — nothing safe to do here, stay silent
  }

  if (typeof navigateTo !== "function") return; // app.js didn't load — bail quietly

  function lang() {
    try { return typeof getAppLanguage === "function" ? getAppLanguage() : "id"; } catch (err) { return "id"; }
  }
  function pick(id, en) { return lang() === "en" ? en : id; }

  const pkg = (window.FreelanceKitPackage && window.FreelanceKitPackage.id) || "full";
  const pkgName = (window.FreelanceKitPackage && window.FreelanceKitPackage.name) || "Freelance Kit";

  const CONTENT = {
    full: {
      tagline: pick(
        "Semua yang kamu butuhin buat ngurus harga, dokumen, dan project freelance — dalam satu aplikasi.",
        "Everything you need to price, document, and manage freelance projects — in one app."
      ),
      bullets: pick(
        ["Hitung harga & biaya revisi otomatis", "Bikin quotation, proposal, invoice & rate card", "Simpan semua project di satu tempat", "Data 100% tersimpan di device kamu — tetap jalan walau offline"],
        ["Automatic price & revision-fee calculator", "Generate quotations, proposals, invoices & rate cards", "Keep every project in one place", "Your data stays 100% on this device — works fully offline"]
      ),
      tour: [
        { page: "dashboard", title: pick("Dashboard", "Dashboard"), text: pick("Ringkasan semua project & dokumen kamu ada di sini.", "A summary of all your projects and documents lives here.") },
        { page: "pricing-calculator", title: pick("Kalkulator Harga", "Pricing Calculator"), text: pick("Hitung harga project secara otomatis berdasarkan detail pekerjaan.", "Calculate a project's price automatically from the job details.") },
        { page: "quotation-generator", title: pick("Generator Dokumen", "Document Generator"), text: pick("Bikin quotation, proposal, invoice, sampai rate card cuma dalam beberapa menit.", "Create quotations, proposals, invoices and rate cards in just a few minutes.") },
        { page: "my-projects", title: pick("My Projects", "My Projects"), text: pick("Semua project yang udah disimpan bisa dibuka & diedit lagi kapan aja di sini.", "Every saved project can be reopened and edited again from here.") },
        { page: "settings", title: pick("Settings", "Settings"), text: pick("Atur profil bisnis, backup data, dan nyalain sync antar device kalau mau.", "Set up your business profile, back up your data, and turn on cross-device sync if you want it.") },
      ],
    },
    calculator: {
      tagline: pick(
        "Hitung harga project & biaya revisi freelance kamu dengan cepat dan akurat.",
        "Calculate your freelance project pricing and revision fees, fast and accurate."
      ),
      bullets: pick(
        ["Kalkulator harga project otomatis", "Kalkulator biaya revisi", "Simpan & lihat semua project", "Data 100% tersimpan di device kamu — tetap jalan walau offline"],
        ["Automatic project pricing calculator", "Revision-fee calculator", "Save and browse every project", "Your data stays 100% on this device — works fully offline"]
      ),
      tour: [
        { page: "dashboard", title: pick("Dashboard", "Dashboard"), text: pick("Ringkasan semua project kamu ada di sini.", "A summary of all your projects lives here.") },
        { page: "pricing-calculator", title: pick("Kalkulator Harga", "Pricing Calculator"), text: pick("Hitung harga project secara otomatis berdasarkan detail pekerjaan.", "Calculate a project's price automatically from the job details.") },
        { page: "revision-calculator", title: pick("Kalkulator Revisi", "Revision Calculator"), text: pick("Hitung biaya tambahan kalau klien minta revisi di luar paket.", "Work out extra fees when a client asks for revisions beyond the package.") },
        { page: "my-projects", title: pick("My Projects", "My Projects"), text: pick("Semua project yang udah disimpan bisa dibuka & diedit lagi kapan aja di sini.", "Every saved project can be reopened and edited again from here.") },
        { page: "settings", title: pick("Settings", "Settings"), text: pick("Atur profil bisnis, backup data, dan nyalain sync antar device kalau mau.", "Set up your business profile, back up your data, and turn on cross-device sync if you want it.") },
      ],
    },
    generator: {
      tagline: pick(
        "Bikin quotation, proposal, invoice & rate card profesional dalam hitungan menit.",
        "Create professional quotations, proposals, invoices & rate cards in minutes."
      ),
      bullets: pick(
        ["Generator quotation & proposal", "Generator invoice & rate card", "Template siap pakai", "Data 100% tersimpan di device kamu — tetap jalan walau offline"],
        ["Quotation & proposal generator", "Invoice & rate card generator", "Ready-to-use templates", "Your data stays 100% on this device — works fully offline"]
      ),
      tour: [
        { page: "dashboard", title: pick("Dashboard", "Dashboard"), text: pick("Ringkasan semua dokumen kamu ada di sini.", "A summary of all your documents lives here.") },
        { page: "quotation-generator", title: pick("Quotation & Proposal", "Quotation & Proposal"), text: pick("Bikin quotation dan proposal buat calon klien.", "Create quotations and proposals for prospective clients.") },
        { page: "invoice-generator", title: pick("Invoice & Rate Card", "Invoice & Rate Card"), text: pick("Bikin invoice buat penagihan dan rate card buat daftar harga jasa kamu.", "Create invoices for billing and rate cards for your service pricing.") },
        { page: "templates", title: pick("Templates", "Templates"), text: pick("Simpan format yang sering dipakai supaya nggak isi ulang dari nol tiap kali.", "Save formats you use often so you don't start from scratch every time.") },
        { page: "settings", title: pick("Settings", "Settings"), text: pick("Atur profil bisnis, backup data, dan nyalain sync antar device kalau mau.", "Set up your business profile, back up your data, and turn on cross-device sync if you want it.") },
      ],
    },
  };

  const data = CONTENT[pkg] || CONTENT.full;

  function markOnboarded() {
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (err) { /* ignore */ }
  }

  /* -----------------------------------------------------------------
     STYLES — scoped under fkob- so nothing here can collide with the
     app's own CSS. Injected once, only when this screen actually shows.
     --------------------------------------------------------------- */
  const style = document.createElement("style");
  style.textContent = `
    .fkob-overlay { position: fixed; inset: 0; z-index: 10050; background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center; padding: 16px; }
    .fkob-card { position: relative; width: 100%; max-width: 860px; max-height: 92vh; overflow: auto;
      background: var(--surface, #fff); border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,0.35);
      display: flex; }
    .fkob-close { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%;
      border: none; background: var(--surface-2, #F6F6F7); color: var(--text-muted, #6B6B6F); font-size: 16px;
      cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; }
    .fkob-left { flex: 1 1 46%; background: var(--primary, #025864); color: #fff; padding: 36px 32px;
      display: flex; flex-direction: column; justify-content: center; gap: 18px; min-width: 0; }
    .fkob-left h1 { margin: 0; font-size: 22px; line-height: 1.3; font-weight: 700; }
    .fkob-left p { margin: 0; font-size: 14px; line-height: 1.55; opacity: 0.92; }
    .fkob-bullets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .fkob-bullets li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.4; }
    .fkob-bullets li::before { content: ""; flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%;
      background: rgba(255,255,255,0.18); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.3 8.4 6.4 11.5l6.3-7' stroke='white' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: center; }
    .fkob-right { flex: 1 1 54%; padding: 40px 32px; display: flex; flex-direction: column; justify-content: center; gap: 16px; min-width: 0; }
    .fkob-right h2 { margin: 0; font-size: 19px; color: var(--text, #000); }
    .fkob-right p { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-muted, #6B6B6F); }
    .fkob-cta { border: none; border-radius: 12px; background: var(--primary, #025864); color: #fff;
      font-weight: 600; font-size: 14.5px; padding: 13px 18px; cursor: pointer; }
    .fkob-cta:hover { background: var(--primary-hover, #01444D); }
    .fkob-skip { border: none; background: none; color: var(--text-muted, #6B6B6F); font-size: 13.5px;
      text-decoration: underline; cursor: pointer; padding: 4px 0; align-self: flex-start; }
    .fkob-note { font-size: 12px; color: var(--text-faint, #9A9A9E); line-height: 1.5; }
    @media (max-width: 720px) {
      .fkob-card { flex-direction: column; max-height: 90vh; }
      .fkob-left, .fkob-right { padding: 28px 22px; }
    }

    .fkob-tour { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 10040;
      display: flex; justify-content: center; }
    .fkob-tour-card { width: 100%; max-width: 420px; background: var(--surface, #fff); color: var(--text, #000);
      border: 1px solid var(--border, #DEDCD5); border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.22);
      padding: 16px 18px; }
    .fkob-tour-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .fkob-tour-step { font-size: 11.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--primary, #025864);
      text-transform: uppercase; }
    .fkob-tour-skip { border: none; background: none; color: var(--text-muted, #6B6B6F); font-size: 12.5px;
      cursor: pointer; text-decoration: underline; padding: 2px; }
    .fkob-tour-title { margin: 0 0 4px; font-size: 15.5px; font-weight: 700; }
    .fkob-tour-text { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--text-muted, #6B6B6F); }
    .fkob-tour-bottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .fkob-tour-dots { display: flex; gap: 5px; }
    .fkob-tour-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong, #CBC9C2); }
    .fkob-tour-dot.is-active { background: var(--primary, #025864); }
    .fkob-tour-actions { display: flex; gap: 8px; }
    .fkob-tour-btn { border: 1px solid var(--border, #DEDCD5); background: var(--surface, #fff); color: var(--text, #000);
      border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .fkob-tour-btn-primary { border-color: var(--primary, #025864); background: var(--primary, #025864); color: #fff; }
  `;
  document.head.appendChild(style);

  /* -----------------------------------------------------------------
     TOUR
     --------------------------------------------------------------- */
  function startTour() {
    const steps = data.tour.filter((s) => {
      // Skip any page this package doesn't actually have.
      try { return !!document.querySelector(`[data-page="${s.page}"]`); } catch (err) { return true; }
    });
    if (!steps.length) return;

    let i = 0;
    const wrap = document.createElement("div");
    wrap.className = "fkob-tour";
    document.body.appendChild(wrap);

    function render() {
      const step = steps[i];
      if (typeof navigateTo === "function") {
        navigateTo(step.page);
        try { history.replaceState(null, "", `#${step.page}`); } catch (err) { /* ignore */ }
      }
      const dots = steps.map((_, idx) => `<span class="fkob-tour-dot${idx === i ? " is-active" : ""}"></span>`).join("");
      const isLast = i === steps.length - 1;
      wrap.innerHTML = `
        <div class="fkob-tour-card">
          <div class="fkob-tour-top">
            <span class="fkob-tour-step">${pick("Panduan Singkat", "Quick Tour")} · ${i + 1}/${steps.length}</span>
            <button type="button" class="fkob-tour-skip" data-fkob-tour-skip>${pick("Lewati tour", "Skip tour")}</button>
          </div>
          <p class="fkob-tour-title">${step.title}</p>
          <p class="fkob-tour-text">${step.text}</p>
          <div class="fkob-tour-bottom">
            <div class="fkob-tour-dots">${dots}</div>
            <div class="fkob-tour-actions">
              ${i > 0 ? `<button type="button" class="fkob-tour-btn" data-fkob-tour-back>${pick("Kembali", "Back")}</button>` : ""}
              <button type="button" class="fkob-tour-btn fkob-tour-btn-primary" data-fkob-tour-next>${isLast ? pick("Selesai", "Done") : pick("Lanjut", "Next")}</button>
            </div>
          </div>
        </div>`;

      wrap.querySelector("[data-fkob-tour-skip]").addEventListener("click", endTour);
      const backBtn = wrap.querySelector("[data-fkob-tour-back]");
      if (backBtn) backBtn.addEventListener("click", () => { i -= 1; render(); });
      wrap.querySelector("[data-fkob-tour-next]").addEventListener("click", () => {
        if (isLast) { endTour(); return; }
        i += 1; render();
      });
    }

    function endTour() {
      wrap.remove();
      if (typeof navigateTo === "function") {
        navigateTo("dashboard");
        try { history.replaceState(null, "", "#dashboard"); } catch (err) { /* ignore */ }
      }
    }

    render();
  }

  /* -----------------------------------------------------------------
     WELCOME SCREEN
     --------------------------------------------------------------- */
  function showWelcome() {
    const overlay = document.createElement("div");
    overlay.className = "fkob-overlay";

    const hasSyncHook = typeof window.__freelanceOpenSyncLogin === "function";

    overlay.innerHTML = `
      <div class="fkob-card" role="dialog" aria-modal="true" aria-label="${pick("Selamat datang", "Welcome")}">
        <button type="button" class="fkob-close" data-fkob-close aria-label="${pick("Tutup", "Close")}">✕</button>
        <div class="fkob-left">
          <h1>${pkgName}</h1>
          <p>${data.tagline}</p>
          <ul class="fkob-bullets">${data.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        </div>
        <div class="fkob-right">
          <h2>${pick("Mulai sekarang", "Get started")}</h2>
          <p>${pick(
            "Daftar pakai email biar data kamu aman dan bisa dibuka di HP, tablet, atau laptop mana aja. Atau lewati dulu — aplikasi ini tetap jalan penuh secara offline di device ini.",
            "Sign up with email so your data is safe and can be opened on any phone, tablet or laptop. Or skip for now — this app still works fully offline on this device."
          )}</p>
          ${hasSyncHook ? `<button type="button" class="fkob-cta" data-fkob-signup>${pick("Daftar / Masuk dengan Email", "Sign Up / Log In with Email")}</button>` : ""}
          <button type="button" class="fkob-skip" data-fkob-skip>${pick("Lewati — pakai offline dulu", "Skip — use offline for now")}</button>
          <p class="fkob-note">${pick(
            "Data kamu tetap tersimpan di device ini walau nggak login. Kamu bisa daftar kapan aja lewat Settings.",
            "Your data stays saved on this device even without logging in. You can sign up anytime from Settings."
          )}</p>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    function dismiss() {
      overlay.remove();
      markOnboarded();
      startTour();
    }

    overlay.querySelector("[data-fkob-close]").addEventListener("click", dismiss);
    overlay.querySelector("[data-fkob-skip]").addEventListener("click", dismiss);

    const signupBtn = overlay.querySelector("[data-fkob-signup]");
    if (signupBtn) {
      signupBtn.addEventListener("click", () => {
        overlay.remove();
        markOnboarded();
        window.__freelanceOpenSyncLogin();
        // The login modal has its own cancel/submit flow; start the tour
        // once it's closed either way, so the tour never fights with it
        // for screen space.
        const loginOverlay = document.querySelector('[data-sync-login-overlay]');
        if (!loginOverlay) { startTour(); return; }
        const observer = new MutationObserver(() => {
          if (loginOverlay.hidden) {
            observer.disconnect();
            startTour();
          }
        });
        observer.observe(loginOverlay, { attributes: true, attributeFilter: ["hidden"] });
      });
    }
  }

  // Give the rest of app.js a tick to finish its own init (routeFromHash,
  // package gating) before showing anything on top of it.
  window.addEventListener("load", () => { setTimeout(showWelcome, 250); });
})();
