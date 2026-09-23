/* ==========================================================================
   SYNC-CONFIG.JS
   Fill this in ONCE with your own free Firebase project's config, then every
   copy of the app you sell uses this same backend (each buyer's data stays
   private to their own login — see the Firestore security rules you'll be
   given alongside this file).

   Until FIREBASE_CONFIG below is filled in, cross-device sync stays fully
   disabled and invisible to buyers — the "Sync Across Devices" section in
   Settings will not appear, and the app behaves exactly as before (100% in
   the browser, zero network calls).
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCy3ocFi5wJillxJQLvx1zRGF6Ue8D-k9A",
  authDomain: "brodoodworks-freelance-kit.firebaseapp.com",
  projectId: "brodoodworks-freelance-kit",
  storageBucket: "brodoodworks-freelance-kit.firebasestorage.app",
  messagingSenderId: "683860766855",
  appId: "1:683860766855:web:d0663b255dc26d0a518822",
};

// True once every required field above has a real value.
const FIREBASE_CONFIG_READY = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId
);
