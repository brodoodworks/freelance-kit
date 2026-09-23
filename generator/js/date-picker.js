/* ==========================================================================
   DATE-PICKER.JS
   A small custom calendar dropdown that REPLACES the native
   <input type="date"> picker everywhere in the app.

   WHY THIS EXISTS: the native date picker on iOS/iPadOS Safari (and its
   closed-box display text) always renders in the DEVICE's system
   language, completely ignoring the app's own language setting or the
   page's <html lang> attribute - confirmed no way to override that from
   a web page, it's a fixed platform limitation. So a user running the
   app in English can still get an Indonesian-only calendar popup (or
   vice versa) whenever their device's system language differs from the
   language they picked inside the app itself - which looks exactly
   like a bug even though nothing in the app's own layout is wrong.

   IMPORTANT - how the native picker is actually blocked:
   `readonly` on the real <input type="date"> is NOT enough - Chrome
   honors it (no native picker), but Safari on iPad/iPhone still opens
   its own native calendar on top of ours even when the field is
   readonly, giving two calendars stacked on top of each other. The
   only fully reliable fix is to never let the real <input type="date">
   receive a user gesture at all: it's kept in the DOM completely
   unchanged (same id, same data-* attribute, same ISO "YYYY-MM-DD"
   value, same input/change events on every commit - every bit of
   existing app code that reads or writes it keeps working exactly as
   before) but made invisible and inert, while a separate real
   <button> is the ONLY thing the user can see or click. No user
   gesture ever reaches the native input, so its native picker never
   has a chance to open.
   ========================================================================== */

(function () {
  const LOCALE = {
    en: {
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      today: "Today",
      clear: "Clear",
      placeholder: "Select date",
    },
    id: {
      months: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
      weekdays: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
      today: "Hari Ini",
      clear: "Kosongkan",
      placeholder: "Pilih tanggal",
    },
  };

  function locale() {
    const lang = (typeof getAppLanguage === "function") ? getAppLanguage() : "en";
    return LOCALE[lang] || LOCALE.en;
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function parseISO(value) {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    return { y: parseInt(m[1], 10), mo: parseInt(m[2], 10) - 1, d: parseInt(m[3], 10) };
  }

  function formatISO(y, mo, d) {
    return `${y}-${pad2(mo + 1)}-${pad2(d)}`;
  }

  function formatDisplay(y, mo, d) {
    const loc = locale();
    return `${d} ${loc.months[mo].slice(0, 3)} ${y}`;
  }

  function refreshDisplay(input) {
    const span = input.__fkDpDisplay;
    const btn = input.__fkDpButton;
    if (!span) return;
    const parsed = parseISO(input.value);
    if (parsed) {
      span.textContent = formatDisplay(parsed.y, parsed.mo, parsed.d);
      if (btn) btn.classList.remove("fk-dp-placeholder");
    } else {
      span.textContent = locale().placeholder;
      if (btn) btn.classList.add("fk-dp-placeholder");
    }
  }

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement("style");
    style.id = "fk-dp-style";
    style.textContent = `
      .fk-dp-wrap { position: relative; display: block; width: 100%; }
      .fk-dp-hidden-input {
        position: absolute !important; opacity: 0 !important; pointer-events: none !important;
        width: 1px !important; height: 1px !important; margin: 0 !important; padding: 0 !important;
        border: 0 !important; overflow: hidden !important; clip: rect(0,0,0,0) !important;
        white-space: nowrap !important;
      }
      .fk-dp-display-btn {
        width: 100%; height: 38px; display: flex; align-items: center; justify-content: space-between;
        padding: 0 12px; border: 1px solid var(--border-strong, #d8d6cf); border-radius: var(--r-sm, 8px);
        background: var(--surface, #fff); font-family: var(--font, inherit); font-size: 13.5px;
        color: var(--text, #1a1a1a); cursor: pointer; text-align: left;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .fk-dp-display-btn:hover { border-color: var(--primary, #025864); }
      .fk-dp-display-btn:focus-visible {
        outline: none; border-color: var(--primary, #025864);
        box-shadow: 0 0 0 3px var(--primary-tint, rgba(2,88,100,0.15));
      }
      .fk-dp-display-btn.fk-dp-placeholder { color: var(--text-muted, #9a9a9e); }
      .fk-dp-display-icon { font-size: 13px; opacity: 0.55; margin-left: 8px; flex-shrink: 0; }

      .fk-dp-popover {
        position: fixed; z-index: 100000; width: 268px;
        background: var(--surface, #fff); border: 1px solid var(--border-strong, #d8d6cf);
        border-radius: var(--r-md, 12px); box-shadow: 0 16px 40px rgba(0,0,0,0.18);
        padding: 14px; font-family: var(--font, inherit); color: var(--text, #1a1a1a);
      }
      .fk-dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .fk-dp-title { font-size: 13.5px; font-weight: 700; }
      .fk-dp-nav {
        width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-strong, #d8d6cf);
        background: var(--surface, #fff); cursor: pointer; font-size: 14px; line-height: 1;
        color: var(--text, #1a1a1a);
      }
      .fk-dp-nav:hover { background: var(--surface-2, #f4f2ec); }
      .fk-dp-weekdays, .fk-dp-grid {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;
      }
      .fk-dp-weekdays { margin-bottom: 4px; }
      .fk-dp-weekdays span { font-size: 10.5px; font-weight: 700; color: var(--text-muted, #8a8a8e); padding: 4px 0; }
      .fk-dp-day {
        border: none; background: transparent; border-radius: 8px; font-size: 12.5px;
        padding: 7px 0; cursor: pointer; color: var(--text, #1a1a1a);
      }
      .fk-dp-day:hover { background: var(--surface-2, #f4f2ec); }
      .fk-dp-day[data-dp-empty] { cursor: default; visibility: hidden; }
      .fk-dp-day[data-dp-selected] { background: var(--primary, #025864); color: #fff; font-weight: 700; }
      .fk-dp-day[data-dp-today]:not([data-dp-selected]) { box-shadow: inset 0 0 0 1px var(--primary, #025864); }
      .fk-dp-footer { display: flex; gap: 8px; margin-top: 10px; }
      .fk-dp-footer button {
        flex: 1; padding: 8px; font-size: 12px; font-weight: 600; border-radius: 8px;
        border: 1px solid var(--border-strong, #d8d6cf); background: var(--surface, #fff);
        cursor: pointer; color: var(--text, #1a1a1a);
      }
      .fk-dp-footer button:hover { background: var(--surface-2, #f4f2ec); }
      [data-theme="dark"] .fk-dp-popover { box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
    `;
    document.head.appendChild(style);
  }

  let activePopover = null;
  let activeInput = null;

  function closePopover() {
    if (activePopover) { activePopover.remove(); activePopover = null; }
    activeInput = null;
    document.removeEventListener("mousedown", handleOutsideClick, true);
    document.removeEventListener("keydown", handleKeydown, true);
    window.removeEventListener("resize", closePopover);
    window.removeEventListener("scroll", closePopover, true);
  }

  function handleOutsideClick(e) {
    if (activePopover && !activePopover.contains(e.target) && e.target !== activeInput.__fkDpButton) {
      closePopover();
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") closePopover();
  }

  function commitValue(input, y, mo, d) {
    const newValue = (y == null) ? "" : formatISO(y, mo, d);
    if (input.value !== newValue) {
      input.value = newValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    refreshDisplay(input);
  }

  function renderCalendar(input, viewY, viewMo) {
    const loc = locale();
    const selected = parseISO(input.value);
    const today = new Date();
    const todayY = today.getFullYear(), todayMo = today.getMonth(), todayD = today.getDate();

    const firstWeekday = new Date(viewY, viewMo, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewY, viewMo + 1, 0).getDate();

    const pop = document.createElement("div");
    pop.className = "fk-dp-popover";
    pop.setAttribute("role", "dialog");

    const header = document.createElement("div");
    header.className = "fk-dp-header";
    const prevBtn = document.createElement("button");
    prevBtn.type = "button"; prevBtn.className = "fk-dp-nav"; prevBtn.textContent = "‹";
    prevBtn.setAttribute("aria-label", "Previous month");
    const title = document.createElement("span");
    title.className = "fk-dp-title";
    title.textContent = `${loc.months[viewMo]} ${viewY}`;
    const nextBtn = document.createElement("button");
    nextBtn.type = "button"; nextBtn.className = "fk-dp-nav"; nextBtn.textContent = "›";
    nextBtn.setAttribute("aria-label", "Next month");
    header.appendChild(prevBtn); header.appendChild(title); header.appendChild(nextBtn);
    pop.appendChild(header);

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "fk-dp-weekdays";
    loc.weekdays.forEach((w) => {
      const span = document.createElement("span");
      span.textContent = w;
      weekdaysRow.appendChild(span);
    });
    pop.appendChild(weekdaysRow);

    const grid = document.createElement("div");
    grid.className = "fk-dp-grid";
    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement("span");
      empty.className = "fk-dp-day";
      empty.setAttribute("data-dp-empty", "");
      grid.appendChild(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fk-dp-day";
      btn.textContent = String(d);
      const isSelected = !!selected && selected.y === viewY && selected.mo === viewMo && selected.d === d;
      const isToday = todayY === viewY && todayMo === viewMo && todayD === d;
      if (isSelected) btn.setAttribute("data-dp-selected", "");
      if (isToday) btn.setAttribute("data-dp-today", "");
      btn.addEventListener("click", () => {
        commitValue(input, viewY, viewMo, d);
        closePopoverAndRefocus(input);
      });
      grid.appendChild(btn);
    }
    pop.appendChild(grid);

    const footer = document.createElement("div");
    footer.className = "fk-dp-footer";
    const clearBtn = document.createElement("button");
    clearBtn.type = "button"; clearBtn.textContent = loc.clear;
    clearBtn.addEventListener("click", () => { commitValue(input, null); closePopoverAndRefocus(input); });
    const todayBtn = document.createElement("button");
    todayBtn.type = "button"; todayBtn.textContent = loc.today;
    todayBtn.addEventListener("click", () => {
      commitValue(input, todayY, todayMo, todayD);
      closePopoverAndRefocus(input);
    });
    footer.appendChild(clearBtn); footer.appendChild(todayBtn);
    pop.appendChild(footer);

    prevBtn.addEventListener("click", () => {
      let m = viewMo - 1, y = viewY;
      if (m < 0) { m = 11; y -= 1; }
      openPopover(input, y, m);
    });
    nextBtn.addEventListener("click", () => {
      let m = viewMo + 1, y = viewY;
      if (m > 11) { m = 0; y += 1; }
      openPopover(input, y, m);
    });

    return pop;
  }

  function closePopoverAndRefocus(input) {
    closePopover();
    if (input.__fkDpButton) input.__fkDpButton.focus();
  }

  function positionPopover(pop, input) {
    const anchor = input.__fkDpButton || input;
    const rect = anchor.getBoundingClientRect();
    const popWidth = 268;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 8) left = window.innerWidth - popWidth - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    const estHeight = 340;
    if (top + estHeight > window.innerHeight - 8) top = Math.max(8, rect.top - estHeight - 6);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function openPopover(input, viewY, viewMo) {
    if (activePopover) activePopover.remove();
    injectStyle();
    const pop = renderCalendar(input, viewY, viewMo);
    document.body.appendChild(pop);
    positionPopover(pop, input);
    activePopover = pop;
    activeInput = input;
    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("keydown", handleKeydown, true);
    window.addEventListener("resize", closePopover);
    window.addEventListener("scroll", closePopover, true);
  }

  function openForInput(input) {
    const parsed = parseISO(input.value);
    const now = new Date();
    const viewY = parsed ? parsed.y : now.getFullYear();
    const viewMo = parsed ? parsed.mo : now.getMonth();
    openPopover(input, viewY, viewMo);
  }

  function enhance(input) {
    if (input.dataset.fkDpEnhanced) return;
    input.dataset.fkDpEnhanced = "1";
    injectStyle();

    // The real <input type="date"> is kept in the DOM completely
    // unchanged data-wise (same id, same data-* attribute, same ISO
    // value) but made invisible and unreachable by any user gesture -
    // see the file header for why that has to be this strict on
    // Safari/iPadOS. A real <button> is the only visible, clickable,
    // focusable element from here on.
    input.setAttribute("tabindex", "-1");
    input.setAttribute("aria-hidden", "true");
    input.classList.add("fk-dp-hidden-input");

    const wrap = document.createElement("span");
    wrap.className = "fk-dp-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "fk-dp-display-btn";
    const text = document.createElement("span");
    const icon = document.createElement("span");
    icon.className = "fk-dp-display-icon";
    icon.textContent = "\u{1F4C5}";
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(text);
    button.appendChild(icon);
    wrap.appendChild(button);

    input.__fkDpDisplay = text;
    input.__fkDpButton = button;
    refreshDisplay(input);

    button.addEventListener("click", () => {
      if (activeInput === input) { closePopover(); return; }
      openForInput(input);
    });
  }

  function enhanceAll() {
    document.querySelectorAll('input[type="date"]').forEach(enhance);
  }

  function refreshAllDisplays() {
    document.querySelectorAll('input[type="date"][data-fk-dp-enhanced]').forEach(refreshDisplay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceAll);
  } else {
    enhanceAll();
  }

  // The UI-language switch does a full page reload (see i18n.js), so a
  // fresh enhanceAll() on load already covers that. This is only for
  // any future code path that might change getAppLanguage() live
  // without a reload - cheap insurance, not currently exercised.
  window.__freelanceEnhanceDatePickers = enhanceAll;
  window.__freelanceRefreshDatePickerDisplays = refreshAllDisplays;
})();
