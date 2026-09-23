/* ==========================================================================
   SYNC.JS
   Optional cross-device sync (Settings > Sync Across Devices). OFF by
   default and invisible in the UI unless js/sync-config.js has a real
   Firebase project filled in (FIREBASE_CONFIG_READY === true) — see that
   file's comments for setup. Until then this file does nothing and the
   app makes zero network calls, exactly as before.

   Design:
   - Firebase (Auth + Firestore, loaded from CDN, "compat" build so no
     bundler is needed) is only fetched the moment the user actually
     clicks "Enable Sync" — not on every page load — so an app nobody
     turns sync on for still never makes a network request.
   - One Firestore document per signed-in user, at syncData/{uid}, holding
     the same shape as a backup file (see backup.js's collectBackupPayload
     — duplicated here on purpose rather than importing it, since
     backup.js's helpers are private to its own block scope).
   - All local writes already funnel through data.js's safeWriteValue /
     safeRemoveValue (see that file's comment) — this file hooks into that
     single chokepoint (window.__freelanceSyncOnWrite) instead of touching
     every module that saves data, so turning sync on/off can never affect
     how projects/quotations/invoices/etc. save locally.
   - Firestore security rules (given to the shop owner alongside
     sync-config.js) restrict each document to its own signed-in owner, so
     one shared free Firebase project can serve every buyer of this app
     without buyers seeing each other's data.
   ========================================================================== */

(function () {
  const syncCard = document.querySelector('[data-sync-card]');
  if (!syncCard) return; // Settings page markup not present on this build.
  if (typeof FIREBASE_CONFIG_READY === "undefined" || !FIREBASE_CONFIG_READY) return; // not configured — stay invisible.

  syncCard.hidden = false;

  const SYNC_ENABLED_KEY = "freelance-kit-sync-enabled";
  const FIREBASE_SDK_VERSION = "10.14.1";
  const FIREBASE_SCRIPTS = [
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore-compat.js`,
  ];

  const offState = syncCard.querySelector('[data-sync-off-state]');
  const onState = syncCard.querySelector('[data-sync-on-state]');
  const statusEl = syncCard.querySelector('[data-sync-status]');
  const enableBtn = syncCard.querySelector('[data-sync-enable]');
  const disableBtn = syncCard.querySelector('[data-sync-disable]');
  const errorEl = syncCard.querySelector('[data-sync-error]');

  const loginOverlay = document.querySelector('[data-sync-login-overlay]');
  const loginEmail = document.querySelector('[data-sync-login-email]');
  const loginPassword = document.querySelector('[data-sync-login-password]');
  const loginError = document.querySelector('[data-sync-login-error]');
  const loginSubmitBtn = document.querySelector('[data-sync-login-submit]');
  const loginCancelBtn = document.querySelector('[data-sync-login-cancel]');

  const conflictOverlay = document.querySelector('[data-sync-conflict-overlay]');
  const keepCloudBtn = document.querySelector('[data-sync-keep-cloud]');
  const keepLocalBtn = document.querySelector('[data-sync-keep-local]');

  // The six local data lists this app persists, same audited set backup.js
  // uses — kept in sync with it deliberately (see backup.js's own comment
  // listing these keys if either list ever needs to change).
  const SYNC_SECTIONS = [
    { key: "projects", read: () => getSavedProjects(), write: (list) => writeSavedProjectsRaw(Array.isArray(list) ? list : []) },
    { key: "quotations", read: () => getSavedQuotations(), write: (list) => writeSavedQuotationsRaw(Array.isArray(list) ? list : []) },
    { key: "proposals", read: () => getSavedProposals(), write: (list) => writeSavedProposalsRaw(Array.isArray(list) ? list : []) },
    { key: "invoices", read: () => getSavedInvoices(), write: (list) => writeSavedInvoicesRaw(Array.isArray(list) ? list : []) },
    { key: "rateCards", read: () => getSavedRateCards(), write: (list) => writeSavedRateCardsRaw(Array.isArray(list) ? list : []) },
    { key: "templates", read: () => getSavedTemplates(), write: (list) => writeSavedTemplatesRaw(Array.isArray(list) ? list : []) },
  ];

  let firebaseReady = null; // Promise, set once loadFirebase() has been called.
  let auth = null;
  let db = null;
  let unsubscribeSnapshot = null;
  let applyingRemote = false; // guards against re-pushing what we just pulled
  let pushTimer = null;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function showLoginError(msg) {
    if (!loginError) return;
    loginError.textContent = msg;
    loginError.hidden = !msg;
  }

  function loadFirebase() {
    if (firebaseReady) return firebaseReady;
    firebaseReady = new Promise((resolve, reject) => {
      let remaining = FIREBASE_SCRIPTS.length;
      FIREBASE_SCRIPTS.forEach((src) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => { remaining -= 1; if (remaining === 0) resolve(); };
        s.onerror = () => reject(new Error("Could not load Firebase SDK — check your internet connection."));
        document.head.appendChild(s);
      });
    }).then(() => {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
    });
    return firebaseReady;
  }

  function collectSyncPayload() {
    const data = { businessProfile: getBusinessProfile() || null };
    SYNC_SECTIONS.forEach((s) => { data[s.key] = s.read(); });
    return data;
  }

  function hasMeaningfulData(data) {
    if (!data) return false;
    if (data.businessProfile && Object.keys(data.businessProfile).length > 0) return true;
    return SYNC_SECTIONS.some((s) => Array.isArray(data[s.key]) && data[s.key].length > 0);
  }

  // Human-readable "what's actually in here" summary for the conflict
  // modal, so picking cloud-vs-local isn't a blind guess — e.g.
  // "3 project(s), 2 invoice(s)" instead of nothing at all.
  function summarizeData(data) {
    if (!data) return t("sync.conflictEmpty");
    const parts = [];
    if (data.businessProfile && Object.keys(data.businessProfile).length > 0) {
      parts.push(t("sync.section.businessProfile"));
    }
    SYNC_SECTIONS.forEach((s) => {
      const list = data[s.key];
      const count = Array.isArray(list) ? list.length : 0;
      if (count > 0) parts.push(`${count} ${t("sync.section." + s.key)}`);
    });
    return parts.length ? parts.join(", ") : t("sync.conflictEmpty");
  }

  function applyRemoteData(data) {
    applyingRemote = true;
    SYNC_SECTIONS.forEach((s) => s.write(data[s.key] || []));
    if (data.businessProfile && typeof data.businessProfile === "object") {
      saveBusinessProfile(data.businessProfile);
    }
    applyingRemote = false;
    if (typeof refreshEverything === "function") refreshEverything();
    if (typeof showToast === "function") showToast(t("sync.pulledToast"));
  }

  function pushLocalData() {
    if (!db || !auth.currentUser) return;
    db.collection("syncData").doc(auth.currentUser.uid).set({
      data: collectSyncPayload(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch((err) => console.warn("[freelance-kit-sync] push failed", err));
  }

  function schedulePush() {
    if (applyingRemote) return; // this write came FROM the remote — don't echo it back
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushLocalData, 800); // small debounce so rapid edits collapse into one write
  }

  // Hook into data.js's single write chokepoint (see that file's comment
  // above safeWriteValue/safeRemoveValue). No-op for every install that
  // never enables sync, since this only runs once sync is active.
  window.__freelanceSyncOnWrite = function () {
    if (auth && auth.currentUser) schedulePush();
  };

  function startListening() {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    unsubscribeSnapshot = db.collection("syncData").doc(auth.currentUser.uid)
      .onSnapshot((docSnap) => {
        if (docSnap.metadata.hasPendingWrites) return; // our own optimistic write echoing back — ignore
        const remote = docSnap.data();
        if (remote && remote.data) applyRemoteData(remote.data);
      }, (err) => console.warn("[freelance-kit-sync] listener error", err));
  }

  function renderSignedIn(email) {
    offState.hidden = true;
    onState.hidden = false;
    statusEl.textContent = t("sync.statusOn", { email });
    showError("");
  }

  function renderSignedOut() {
    offState.hidden = false;
    onState.hidden = true;
  }

  function friendlyAuthError(err) {
    const code = err && err.code;
    switch (code) {
      case "auth/invalid-email": return t("sync.error.invalidEmail");
      case "auth/weak-password": return t("sync.error.weakPassword");
      case "auth/unauthorized-domain":
        // This device's domain isn't in the Firebase project's Authentication
        // > Settings > Authorized domains list yet — every sign-in from here
        // fails until the shop owner adds it there, even with a correct
        // email/password. Surfaced with the exact code so this is easy to
        // tell apart from a real wrong-password case.
        return `${t("sync.error.generic")} (auth/unauthorized-domain — add this domain in Firebase Console > Authentication > Settings > Authorized domains)`;
      case "auth/network-request-failed":
        return `${t("sync.error.generic")} (auth/network-request-failed — check internet connection)`;
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return `${t("sync.error.generic")} (${code} — wrong password for this email)`;
      default:
        // Always include the raw code — "Could not connect" alone isn't
        // enough to tell a wrong password apart from a config problem.
        return code ? `${t("sync.error.generic")} (${code})` : t("sync.error.generic");
    }
  }

  async function resolveInitialData() {
    const uid = auth.currentUser.uid;
    const docSnap = await db.collection("syncData").doc(uid).get();
    const remote = docSnap.exists ? docSnap.data().data : null;
    const local = collectSyncPayload();
    const remoteHasData = hasMeaningfulData(remote);
    const localHasData = hasMeaningfulData(local);

    if (remoteHasData && localHasData) {
      // Both sides have real data — let the person choose rather than
      // silently discarding either one. Show what's actually in each side
      // first, so the choice isn't blind.
      const localSummaryEl = document.querySelector('[data-sync-conflict-local-summary]');
      const cloudSummaryEl = document.querySelector('[data-sync-conflict-cloud-summary]');
      if (localSummaryEl) localSummaryEl.textContent = summarizeData(local);
      if (cloudSummaryEl) cloudSummaryEl.textContent = summarizeData(remote);
      conflictOverlay.hidden = false;
      return new Promise((resolve) => {
        function cleanup() {
          conflictOverlay.hidden = true;
          keepCloudBtn.removeEventListener("click", onCloud);
          keepLocalBtn.removeEventListener("click", onLocal);
        }
        function onCloud() { cleanup(); applyRemoteData(remote); resolve(); }
        function onLocal() { cleanup(); pushLocalData(); resolve(); }
        keepCloudBtn.addEventListener("click", onCloud);
        keepLocalBtn.addEventListener("click", onLocal);
      });
    }
    if (remoteHasData && !localHasData) {
      applyRemoteData(remote);
      return;
    }
    // Cloud empty (or missing) — this device's data becomes the baseline.
    pushLocalData();
  }

  async function completeSignIn() {
    localStorage.setItem(SYNC_ENABLED_KEY, "1");
    renderSignedIn(auth.currentUser.email);
    await resolveInitialData();
    startListening();
  }

  async function signInOrCreate(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        await auth.createUserWithEmailAndPassword(email, password);
      } else {
        throw err;
      }
    }
  }

  function openLoginModal() {
    loginEmail.value = "";
    loginPassword.value = "";
    showLoginError("");
    loginOverlay.hidden = false;
    loginEmail.focus();
  }
  function closeLoginModal() { loginOverlay.hidden = true; }

  // Exposed so onboarding.js can open this exact same modal from the
  // first-run welcome screen instead of duplicating any auth UI/logic.
  // Only defined when sync is actually configured (this line only runs
  // past the two early-returns at the top of this file).
  window.__freelanceOpenSyncLogin = openLoginModal;

  if (enableBtn) enableBtn.addEventListener("click", openLoginModal);
  if (loginCancelBtn) loginCancelBtn.addEventListener("click", closeLoginModal);
  if (loginOverlay) loginOverlay.addEventListener("click", (e) => { if (e.target === loginOverlay) closeLoginModal(); });

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener("click", async () => {
      const email = (loginEmail.value || "").trim();
      const password = loginPassword.value || "";
      if (!email || !password) { showLoginError(t("sync.error.generic")); return; }

      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = t("sync.loading");
      showLoginError("");
      try {
        await loadFirebase();
        await signInOrCreate(email, password);
        closeLoginModal();
        await completeSignIn();
        if (typeof showToast === "function") showToast(t("sync.enabledToast"));
      } catch (err) {
        console.warn("[freelance-kit-sync] sign-in failed", err);
        showLoginError(friendlyAuthError(err));
      } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = t("sync.submit");
      }
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener("click", () => {
      localStorage.removeItem(SYNC_ENABLED_KEY);
      if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
      if (auth) auth.signOut().catch(() => {});
      renderSignedOut();
      if (typeof showToast === "function") showToast(t("sync.disabledToast"));
    });
  }

  // Resume sync silently on later visits if it was already turned on —
  // Firebase Auth persists the session locally, so no re-login is needed.
  if (localStorage.getItem(SYNC_ENABLED_KEY) === "1") {
    loadFirebase().then(() => {
      auth.onAuthStateChanged((user) => {
        if (user) {
          renderSignedIn(user.email);
          startListening();
        } else {
          localStorage.removeItem(SYNC_ENABLED_KEY);
          renderSignedOut();
        }
      });
    }).catch((err) => {
      console.warn("[freelance-kit-sync] resume failed", err);
      showError(t("sync.error.generic"));
    });
  }
})();
