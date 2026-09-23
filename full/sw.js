// Freelance Kit — offline cache (app shell). Bump CACHE_NAME when files change
// so returning users get the update instead of a stale cached copy.
const CACHE_NAME = "freelance-kit-v7";
const ASSETS = [
  "./Freelance Kit.html",
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
