/* ==========================================================================
   PDF-EXPORT.JS
   Shared "Export PDF" implementation for Quotation / Invoice / Proposal /
   Rate Card. All four generators reuse the same #quo-print-sheet element
   and the same .quo-doc-* / .prop-doc-* CSS classes for their print-ready
   markup, so a single exporter here replaces four near-identical
   window.print() call sites.

   WHY: window.print() hands control to the OS print/share sheet. On
   iPad/iOS Safari especially, that sheet can feel slow to open, and the
   browser's own print pagination sometimes spills a couple of stray lines
   onto a near-empty extra page. This exporter instead renders the sheet to
   a canvas (html2canvas) and slices it into a real PDF file (jsPDF) sized
   to the ACTUAL content height, then triggers a normal one-tap file
   download - no OS dialog, and a short document is exactly one page.

   The two libraries (html2canvas + jsPDF) are bundled locally in
   js/vendor/ (not loaded from a CDN) so the app keeps working fully
   offline as an installed PWA. They're only fetched the first time someone
   actually exports a PDF, so normal page loads stay light.
   ========================================================================== */

(function () {
  let libsPromise = null;

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") { resolve(); return; }
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("load-failed:" + src)));
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => { s.dataset.loaded = "1"; resolve(); };
      s.onerror = () => reject(new Error("load-failed:" + src));
      document.head.appendChild(s);
    });
  }

  function loadLibs() {
    if (libsPromise) return libsPromise;
    libsPromise = Promise.all([
      window.html2canvas ? Promise.resolve() : loadScriptOnce("js/vendor/html2canvas.min.js"),
      (window.jspdf && window.jspdf.jsPDF) ? Promise.resolve() : loadScriptOnce("js/vendor/jspdf.umd.min.js"),
    ]);
    return libsPromise;
  }

  function waitForLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        ready.then(resolve).catch(resolve);
      }));
    });
  }

  // Renders `sheetEl` (already filled with a document's print-ready
  // markup) into a downloadable A4 PDF and triggers the download.
  // Returns a promise that resolves once the download has been triggered,
  // or rejects (caller should fall back to window.print()) if anything
  // along the way fails - e.g. the vendor scripts couldn't be fetched at
  // all (first export ever, while genuinely offline).
  async function exportSheetAsPdf(sheetEl, filename) {
    await loadLibs();
    const { jsPDF } = window.jspdf;
    if (!window.html2canvas || !jsPDF) throw new Error("pdf-libs-unavailable");

    sheetEl.classList.add("pdf-capture-sheet");
    await waitForLayout();

    // Measure the real, on-page element, then pin its height with an
    // explicit inline style. html2canvas re-lays the element out inside
    // its own hidden clone/iframe and re-measures it there via
    // getBoundingClientRect() - for this box (height:auto driven purely
    // by a CSS min-height + overflowing table content) that
    // re-measurement has been observed to come back clamped to the
    // min-height itself, silently dropping every row past page 1 for a
    // multi-page document, even though the real on-page element is
    // genuinely taller. An explicit "height" (not just min-height) is
    // resolved the same way in both places, so this removes the mismatch
    // instead of trying to out-guess it via html2canvas's own options.
    const realWidth = sheetEl.scrollWidth;
    const realHeight = sheetEl.scrollHeight;
    sheetEl.style.height = realHeight + "px";

    let canvas;
    try {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 1.5;
      canvas = await window.html2canvas(sheetEl, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: realWidth,
        height: realHeight,
        windowWidth: realWidth,
        windowHeight: realHeight,
      });
    } finally {
      sheetEl.classList.remove("pdf-capture-sheet");
      sheetEl.style.height = "";
    }
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pxPerMm = canvas.width / pageWidthMm;
    const pageHeightPx = Math.round(pageHeightMm * pxPerMm);
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, i * pageHeightPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, sliceHeightMm);
    }

    pdf.save(filename);
  }

  // Small "Menyiapkan PDF... / Preparing PDF..." toast so the tap has
  // instant feedback while html2canvas/jsPDF do their (usually well under
  // a second) work - replaces the long silent wait for the OS print sheet.
  function showToast(text) {
    let el = document.getElementById("fk-pdf-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "fk-pdf-toast";
      el.className = "fk-pdf-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("fk-pdf-toast-visible");
    return el;
  }
  function hideToast() {
    const el = document.getElementById("fk-pdf-toast");
    if (el) el.classList.remove("fk-pdf-toast-visible");
  }

  // High-level helper used by every generator's "Export PDF" button.
  // Handles the toast, the export, and falling back to the old
  // window.print() flow if PDF generation fails for any reason (e.g. the
  // vendor libraries can't be fetched because this is the very first
  // export attempt and the device is offline).
  async function exportAsPdf(sheetEl, filename, labels) {
    const preparingText = (labels && labels.preparing) ||
      (typeof t === "function" ? t("pdf.preparing") : "Menyiapkan PDF...");
    showToast(preparingText);
    try {
      await exportSheetAsPdf(sheetEl, filename);
    } catch (err) {
      // Fallback: the classic native print/share sheet still works even
      // when the direct-download path can't run.
      await waitForLayout();
      window.print();
    } finally {
      hideToast();
    }
  }

  // Strips characters that are invalid/awkward in a downloaded file name
  // on Windows/macOS/iOS (\ / : * ? " < > |) so a document number like
  // "INV/2026/09" turns into a filename that actually saves cleanly.
  function safeFileName(str) {
    return String(str || "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "Dokumen";
  }

  window.FreelanceKitPDF = { exportAsPdf, exportSheetAsPdf, safeFileName };
})();
