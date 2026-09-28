// Freelance Kit — offline cache (app shell). Bump CACHE_NAME when files change
// so returning users get the update instead of a stale cached copy.
const CACHE_NAME = "freelance-kit-v16";

// The app shell can be requested under more than one URL: "Freelance
// Kit.html" is the entry file inside the downloadable zip, while a
// GitHub Pages deployment serves the same page as "index.html" (and as
// "./" for the bare folder URL). Precaching all three — and always
// falling back to whichever one actually got cached when a page load
// happens offline — means offline access keeps working no matter which
// of these URLs the app is actually being served under.
const SHELL_CANDIDATES = ["./Freelance Kit.html", "./index.html", "./"];

const ASSETS = [
  ...SHELL_CANDIDATES,
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/backup-reminder.js",
  "./js/backup.js",
  "./js/calculator.js",
  "./js/data.js",
  "./js/help.js",
  "./js/i18n.js",
  "./js/date-picker.js",
  "./js/pdf-export.js",
  "./js/vendor/html2canvas.min.js",
  "./js/vendor/jspdf.umd.min.js",
  "./js/install-prompt.js",
  "./js/onboarding.js",
  "./js/access-gate.js",
  "./js/invoice.js",
  "./js/package.js",
  "./js/projects.js",
  "./js/proposal.js",
  "./js/quotation.js",
  "./js/ratecard.js",
  "./js/settings.js",
  "./js/sync-config.js",
  "./js/sync.js",
  "./js/templates.js",
  "./assets/favicon-256.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache.addAll() aborts the ENTIRE precache if even one URL 404s —
      // e.g. "./index.html" not existing in the downloaded zip, or
      // "./Freelance Kit.html" not existing on a GitHub Pages deploy.
      // Caching each file independently means one missing/renamed file
      // no longer breaks offline support for everything else.
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Page loads/reloads (navigations) always fall back to whichever
  // cached shell URL actually exists, instead of only matching the
  // exact requested URL — so offline still works even if the site is
  // reached as "index.html" while only "Freelance Kit.html" (or vice
  // versa) ended up cached.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        for (const url of SHELL_CANDIDATES) {
          const match = await cache.match(url);
          if (match) return match;
        }
        return cache.match(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
