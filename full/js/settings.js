/* ==========================================================================
   SETTINGS.JS
   Business Settings page: one shared business profile used across
   Quotation, Proposal, and Invoice Generator. Extends the profile
   object those three already read/write (businessName, businessEmail,
   businessPhone, businessWebsite, businessAddress, logo) with the
   richer fields this page manages — nothing in the three generators
   needs to change shape, they just keep working on their subset.
   ========================================================================== */

const setPanel = document.querySelector('[data-page-panel="settings"]');

if (setPanel) {

  const fields = {};
  setPanel.querySelectorAll('[data-set]').forEach((el) => { fields[el.dataset.set] = el; });

  const previewEl = setPanel.querySelector('[data-set-preview]');
  const validationEl = setPanel.querySelector('[data-set-validation]');
  const saveFeedbackEl = setPanel.querySelector('[data-set-save-feedback]');
  const saveStatusEl = setPanel.querySelector('[data-set-save-status]');

  const logoInput = setPanel.querySelector('[data-set-logo-input]');
  const logoPreview = setPanel.querySelector('[data-set-logo-preview]');
  const logoRemoveBtn = setPanel.querySelector('[data-set-logo-remove]');
  const qrisInput = setPanel.querySelector('[data-set-qris-input]');
  const qrisPreview = setPanel.querySelector('[data-set-qris-preview]');
  const qrisRemoveBtn = setPanel.querySelector('[data-set-qris-remove]');

  let logoDataUrl = null;
  let qrisDataUrl = null;
  let setDirty = false;

  /* ---- Save status indicator — real state only, same pattern used by
     the document generators. No autosave is implied or performed. ---- */

  function setSetDirty(isDirty) {
    setDirty = isDirty;
    if (!saveStatusEl) return;
    if (isDirty) {
      saveStatusEl.textContent = t("saveStatus.unsaved");
      saveStatusEl.className = "quo-save-status is-dirty";
    } else {
      saveStatusEl.textContent = t("saveStatus.changesSaved");
      saveStatusEl.className = "quo-save-status is-saved";
    }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function wireImageUpload(input, previewEl2, removeBtn, onChange) {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 1.5 * 1024 * 1024) {
        alert(t("validation.imageTooLarge"));
        input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { onChange(reader.result); renderPreview(); };
      reader.readAsDataURL(file);
    });
    removeBtn.addEventListener("click", () => {
      input.value = "";
      onChange(null);
      renderPreview();
    });
  }

  function renderImagePreview(dataUrl, previewEl2, removeBtn, emptyLabel) {
    if (dataUrl) {
      previewEl2.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
      removeBtn.hidden = false;
    } else {
      previewEl2.textContent = emptyLabel;
      removeBtn.hidden = true;
    }
  }

  wireImageUpload(logoInput, logoPreview, logoRemoveBtn, (val) => {
    logoDataUrl = val;
    setSetDirty(true);
    renderImagePreview(logoDataUrl, logoPreview, logoRemoveBtn, "No logo");
  });
  wireImageUpload(qrisInput, qrisPreview, qrisRemoveBtn, (val) => {
    qrisDataUrl = val;
    setSetDirty(true);
    renderImagePreview(qrisDataUrl, qrisPreview, qrisRemoveBtn, "No image");
  });

  function renderPreview() {
    const lines = [];
    if (fields.tagline.value.trim()) lines.push(fields.tagline.value.trim());
    if (fields.ownerName.value.trim()) lines.push(fields.ownerName.value.trim());
    const addressParts = [fields.businessAddress.value.trim(), fields.city.value.trim(), fields.country.value.trim()].filter(Boolean);
    addressParts.forEach((p) => lines.push(p));
    if (fields.businessEmail.value.trim()) lines.push(fields.businessEmail.value.trim());
    if (fields.businessPhone.value.trim()) lines.push(fields.businessPhone.value.trim());
    if (fields.businessWebsite.value.trim()) lines.push(fields.businessWebsite.value.trim());
    if (fields.instagram.value.trim()) lines.push(fields.instagram.value.trim());

    previewEl.innerHTML = `
      <div class="identity-preview-inner">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="identity-preview-logo" alt="Logo">` : ""}
        <p class="identity-preview-name">${escapeHtml(fields.businessName.value) || t("doc.yourBusinessName")}</p>
        ${lines.map((l) => `<p class="identity-preview-line">${escapeHtml(l)}</p>`).join("")}
      </div>
    `;
  }

  Object.values(fields).forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => { setSetDirty(true); renderPreview(); });
    el.addEventListener("change", () => { setSetDirty(true); renderPreview(); });
  });

  function validate() {
    const problems = [];
    if (!fields.businessName.value.trim()) problems.push("Business Name wajib diisi.");
    if (!fields.businessEmail.value.trim()) problems.push("Email wajib diisi.");
    if (!fields.businessPhone.value.trim()) problems.push("Phone wajib diisi.");
    return problems;
  }
  function showValidation(problems) {
    if (!problems.length) { validationEl.hidden = true; return false; }
    validationEl.hidden = false;
    validationEl.textContent = problems.join(" ");
    return true;
  }

  function loadIntoForm() {
    const p = getBusinessProfile() || {};
    fields.businessName.value = p.businessName || "";
    fields.tagline.value = p.tagline || "";
    fields.ownerName.value = p.ownerName || "";
    fields.businessEmail.value = p.businessEmail || "";
    fields.businessPhone.value = p.businessPhone || "";
    fields.businessWebsite.value = p.businessWebsite || "";
    fields.instagram.value = p.instagram || "";
    fields.businessAddress.value = p.businessAddress || "";
    fields.city.value = p.city || "";
    fields.country.value = p.country || "";

    fields.paymentMethod.value = p.paymentMethod || "";
    fields.bankName.value = p.bankName || "";
    fields.accountName.value = p.accountName || "";
    fields.accountNumber.value = p.accountNumber || "";
    fields.paymentInstructions.value = p.paymentInstructions || "";

    fields.defaultTax.value = p.defaultTax || 0;
    fields.defaultValidUntil.value = p.defaultValidUntil || 14;
    fields.defaultPaymentTerms.value = p.defaultPaymentTerms || "50-50";
    fields.currency.value = "IDR";

    logoDataUrl = p.logo || null;
    qrisDataUrl = p.qris || null;
    renderImagePreview(logoDataUrl, logoPreview, logoRemoveBtn, "No logo");
    renderImagePreview(qrisDataUrl, qrisPreview, qrisRemoveBtn, "No image");

    saveFeedbackEl.hidden = true;
    validationEl.hidden = true;
    setSetDirty(false);
    renderPreview();
  }

  setPanel.querySelector('[data-set-save]').addEventListener("click", () => {
    const problems = validate();
    if (showValidation(problems)) { saveFeedbackEl.hidden = true; return; }

    const ok = saveBusinessProfile({
      businessName: fields.businessName.value,
      tagline: fields.tagline.value,
      ownerName: fields.ownerName.value,
      businessEmail: fields.businessEmail.value,
      businessPhone: fields.businessPhone.value,
      businessWebsite: fields.businessWebsite.value,
      instagram: fields.instagram.value,
      businessAddress: fields.businessAddress.value,
      city: fields.city.value,
      country: fields.country.value,
      logo: logoDataUrl,
      paymentMethod: fields.paymentMethod.value,
      bankName: fields.bankName.value,
      accountName: fields.accountName.value,
      accountNumber: fields.accountNumber.value,
      qris: qrisDataUrl,
      paymentInstructions: fields.paymentInstructions.value,
      defaultTax: Number(fields.defaultTax.value) || 0,
      defaultValidUntil: Number(fields.defaultValidUntil.value) || 14,
      defaultPaymentTerms: fields.defaultPaymentTerms.value,
      currency: "IDR",
    });

    saveFeedbackEl.classList.remove("save-feedback-error");
    if (!ok) {
      // Storage rejected the write — never claim saved, never mark the
      // form clean (setSetDirty stays true so the person still sees
      // there are unsaved changes if they navigate away).
      saveFeedbackEl.classList.add("save-feedback-error");
      saveFeedbackEl.textContent = t("profile.saveError");
      saveFeedbackEl.hidden = false;
      if (typeof showToast === "function") {
        showToast(t("profile.saveErrorToast.title"), t("profile.saveErrorToast.detail"));
      }
      return;
    }

    saveFeedbackEl.textContent = t("profile.saved");
    saveFeedbackEl.hidden = false;
    setSetDirty(false);
    renderProfileCard();
    if (typeof showToast === "function") showToast(t("profile.savedToast"));
  });

  setPanel.querySelector('[data-set-reset]').addEventListener("click", () => {
    openDeleteConfirm("business-profile", { type: "business-profile" });
  });

  function afterReset() {
    loadIntoForm();
    renderProfileCard();
  }

  function renderProfileCard() {
    const card = document.querySelector('[data-profile-card]');
    if (!card) return;
    const profile = getBusinessProfile();
    const { filled, total, percent } = getProfileCompleteness();

    if (!profile || !profile.businessName) {
      card.innerHTML = `
        <div class="profile-card-inner profile-card-empty">
          <div>
            <p class="profile-card-title">${t("profileCard.title")}</p>
            <p class="profile-card-text">${t("profileCard.text")}</p>
          </div>
          <button class="btn btn-secondary" data-profile-card-cta>${t("profileCard.cta")}</button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="profile-card-inner">
          <div class="profile-card-info">
            <p class="profile-card-name">${escapeHtml(profile.businessName)}</p>
            <p class="profile-card-text">Profile Complete \u2014 ${filled}/${total} fields</p>
          </div>
          <div class="profile-card-progress">
            <div class="profile-card-bar"><div class="profile-card-bar-fill" style="width:${percent}%"></div></div>
            <span class="profile-card-percent">${percent}%</span>
          </div>
          <button class="btn btn-secondary" data-profile-card-cta>Edit Profile</button>
        </div>
      `;
    }

    card.querySelector('[data-profile-card-cta]').addEventListener("click", () => {
      navigateTo("settings");
      history.replaceState(null, "", "#settings");
    });
  }

  window.FreelanceSettings = { loadIntoForm, renderProfileCard, afterReset };

  loadIntoForm();
  renderProfileCard();
}

