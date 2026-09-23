/* ==========================================================================
   INSTALL-PROMPT.JS
   Auto-shown "install this app" banner. Only makes sense once the app is
   actually hosted (https) — on a plain local file this never fires, since
   neither Android's install event nor iOS's standalone check behave the
   same way there, and there's nothing useful to prompt for.

   - Android / desktop Chrome & Edge: the browser fires
     "beforeinstallprompt" when the page qualifies (manifest + service
     worker present, which it is). We capture that event instead of letting
     the browser show its own mini-infobar, and drive our own banner with
     an "Install App" button — tapping it replays the SAME native prompt
     (Chrome's real install dialog), so this is a real install, not a
     shortcut.
   - iOS Safari: Apple does not expose any install-prompt API at all, on
     purpose — there is no way for a website to trigger it. The only thing
     possible is showing instructions for the manual "Share > Add to Home
     Screen" steps, which is what this does there.
   - Already installed (running standalone) or not on https: nothing shows.
   ========================================================================== */

(function () {
  if (!window.isSecureContext) return; // file:// — nothing meaningful to offer

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true; // iOS Safari's own flag
  if (isStandalone) return; // already installed/opened as an app

  const DISMISS_KEY = "freelance-kit-install-banner-dismissed";
  if (localStorage.getItem(DISMISS_KEY) === "1") return;

  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);

  let deferredPrompt = null;

  function buildBanner({ showButton }) {
    const banner = document.createElement("div");
    banner.setAttribute("data-install-banner", "");
    banner.style.cssText = [
      "position:fixed", "left:12px", "right:12px", "bottom:12px", "z-index:9999",
      "background:var(--surface,#fff)", "color:var(--text,#000)",
      "border:1px solid var(--border,#DEDCD5)", "border-radius:16px",
      "box-shadow:0 8px 24px rgba(0,0,0,0.18)", "padding:14px 16px",
      "display:flex", "align-items:center", "gap:12px",
      "font-family:inherit", "font-size:14px", "line-height:1.4",
    ].join(";");

    const text = document.createElement("div");
    text.style.cssText = "flex:1;";
    text.innerHTML = showButton
      ? "<strong>Install app ini?</strong><br>Buka langsung dari home screen, tanpa browser."
      : "<strong>Install app ini:</strong><br>Tap tombol Share <span style=\"display:inline-block;transform:translateY(2px)\">⬆️</span> di bawah, lalu pilih <strong>“Add to Home Screen”</strong>.";
    banner.appendChild(text);

    if (showButton) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Install";
      btn.style.cssText = [
        "background:var(--primary,#025864)", "color:#fff", "border:none",
        "border-radius:10px", "padding:10px 16px", "font-weight:600",
        "font-size:14px", "white-space:nowrap", "cursor:pointer",
      ].join(";");
      btn.addEventListener("click", async () => {
        banner.remove();
        localStorage.setItem(DISMISS_KEY, "1");
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => {});
        deferredPrompt = null;
      });
      banner.appendChild(btn);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Tutup");
    close.textContent = "✕";
    close.style.cssText = [
      "background:none", "border:none", "font-size:16px", "line-height:1",
      "color:var(--text-muted,#6B6B6F)", "cursor:pointer", "padding:4px",
    ].join(";");
    close.addEventListener("click", () => {
      banner.remove();
      localStorage.setItem(DISMISS_KEY, "1");
    });
    banner.appendChild(close);

    return banner;
  }

  if (isIOS) {
    // No install event exists on iOS — just show the manual instructions,
    // once the page has settled so it doesn't fight with initial render.
    window.addEventListener("load", () => {
      setTimeout(() => document.body.appendChild(buildBanner({ showButton: false })), 800);
    });
    return;
  }

  // Android / desktop Chromium: wait for the real browser signal that the
  // page qualifies for installation before showing anything.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // stop the browser's own mini-infobar
    deferredPrompt = event;
    document.body.appendChild(buildBanner({ showButton: true }));
  });

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(DISMISS_KEY, "1");
    const el = document.querySelector("[data-install-banner]");
    if (el) el.remove();
  });
})();
