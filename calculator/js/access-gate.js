/* ==========================================================================
   ACCESS-GATE.JS
   A lightweight "enter your purchase code" lock screen, shown once per
   device/browser before the app itself is usable.

   IMPORTANT — what this is and isn't:
   This is a static, 100%-client-side app with no backend and no way to
   verify a code against a server. So this is NOT real DRM/licensing —
   anyone determined enough to read this file's source can find the
   correct-answer hash and work around it. What it DOES do: stop the
   app from working for someone who just got a bare link with no
   context (e.g. a leaked/reshared URL with no accompanying code),
   which is the realistic, casual way access tends to leak. Treat the
   code the same as you'd treat a download link — something you hand
   out at the point of sale, not something you publish anywhere public.

   The code itself is never stored in this file as plain text — only
   its SHA-256 hash — so opening dev tools doesn't just hand the code
   over in plain sight (a small speed bump, not real secrecy).

   This file MUST be the very first thing loaded in <head>, before any
   other script or stylesheet, so it can hide the page before first
   paint if this device hasn't unlocked yet — see the inline <style>
   it injects below.
   ========================================================================== */

(function () {
  var ACCESS_KEY = "freelance-kit-access-granted";
  var unlocked = false;
  try {
    unlocked = localStorage.getItem(ACCESS_KEY) === "1";
  } catch (err) {
    unlocked = true; // storage unavailable - fail OPEN, not closed, so a
                      // broken/blocked localStorage never permanently
                      // locks a legitimate buyer out of their own purchase
  }
  if (unlocked) return;

  // SHA-256 of the real access code (trimmed, uppercased) - set per
  // package build. Never the plain code itself.
  var CODE_HASH = "1a22e2353e3ef7a26b628ad9fef29d4936eed545ea9bc8e1920aef3d9af61cf2";

  var style = document.createElement("style");
  style.id = "fk-access-gate-style";
  style.textContent = "html{visibility:hidden !important;}";
  document.head.appendChild(style);

  function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", enc).then(function (buf) {
      return Array.prototype.map
        .call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); })
        .join("");
    });
  }

  function showGate() {
    var overlay = document.createElement("div");
    overlay.id = "fk-access-gate";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:999999", "background:#EDEAE2",
      "display:flex", "align-items:center", "justify-content:center", "padding:20px",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      // The gate <style> sets <html> to visibility:hidden so nothing
      // flashes before this screen - visibility inherits to children,
      // so this overlay has to explicitly opt back in or it would be
      // hidden right along with everything else.
      "visibility:visible",
    ].join(";");
    overlay.innerHTML =
      '<div style="max-width:360px;width:100%;background:#fff;border-radius:20px;padding:32px 28px;' +
      'box-shadow:0 24px 64px rgba(0,0,0,0.2);text-align:center;">' +
        '<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#000;">Freelance Kit</p>' +
        '<p style="margin:0 0 20px;font-size:13.5px;line-height:1.55;color:#6B6B6F;">' +
          'Masukin kode akses yang kamu dapet pas beli di Lynk.id.<br>' +
          'Enter the access code you received when you purchased on Lynk.id.' +
        '</p>' +
        '<input id="fk-access-input" type="text" autocomplete="off" autocapitalize="characters" ' +
          'spellcheck="false" placeholder="XXXXXXX-XXXX" ' +
          'style="width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #DEDCD5;' +
          'border-radius:10px;font-size:15px;text-align:center;letter-spacing:0.04em;margin-bottom:10px;">' +
        '<p id="fk-access-error" style="display:none;margin:0 0 12px;font-size:12.5px;color:#B3261E;">' +
          'Kode salah, coba lagi. / Wrong code, try again.</p>' +
        '<button id="fk-access-submit" type="button" style="width:100%;border:none;border-radius:10px;' +
          'background:#025864;color:#fff;font-weight:600;font-size:14px;padding:13px;cursor:pointer;">' +
          'Buka Aplikasi / Unlock</button>' +
        '<p style="margin:16px 0 0;font-size:11.5px;color:#9A9A9E;">Belum punya kode? Beli dulu di Lynk.id. / ' +
          "Don't have a code? Purchase first on Lynk.id.</p>" +
      '</div>';
    document.body.appendChild(overlay);

    var input = overlay.querySelector("#fk-access-input");
    var err = overlay.querySelector("#fk-access-error");
    var btn = overlay.querySelector("#fk-access-submit");

    function tryUnlock() {
      var raw = (input.value || "").trim().toUpperCase();
      if (!raw) return;
      sha256Hex(raw).then(function (hash) {
        if (hash === CODE_HASH) {
          try { localStorage.setItem(ACCESS_KEY, "1"); } catch (e) { /* ignore */ }
          overlay.remove();
          var s = document.getElementById("fk-access-gate-style");
          if (s) s.remove();
        } else {
          err.style.display = "block";
          input.focus();
          input.select();
        }
      });
    }

    btn.addEventListener("click", tryUnlock);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryUnlock(); });
    setTimeout(function () { input.focus(); }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showGate);
  } else {
    showGate();
  }
})();
