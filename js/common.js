// common.js
document.addEventListener("DOMContentLoaded", function () {
    /* ========= COMMON HELPERS ========= */
  
    function updateBadge(el, text) {
      if (!el) return;
      if (!text) {
        el.style.display = "none";
        return;
      }
      el.textContent = text.length + " ký tự";
      el.style.display = "inline-flex";
    }
  
    function getIndentUnitFromValue(val) {
      if (val === "tab") return "\t";
      const size = parseInt(val, 10) || 2;
      return " ".repeat(size);
    }
  
    /**
     * Button copy kiểu ChatGPT:
     * - btn: nút copy .copy-btn chứa icon + label
     * - targetEl: textarea (output) cần copy value
     */
    function attachCopyButton(btn, targetEl) {
      if (!btn || !targetEl) return;
  
      const labelEl   = btn.querySelector(".copy-btn__label");
      const iconCopy  = btn.querySelector(".copy-default");
      const iconCheck = btn.querySelector(".copy-check");
  
      const defaultLabel =
        btn.dataset.labelDefault ||
        (labelEl ? labelEl.textContent.trim() : "Sao chép mã");
      const copiedLabel =
        btn.dataset.labelCopied || "Đã sao chép";
  
      // trạng thái ban đầu
      if (labelEl) labelEl.textContent = defaultLabel;
      if (iconCopy)  iconCopy.style.display  = "inline-flex";
      if (iconCheck) iconCheck.style.display = "none";
      btn.classList.remove("is-copied");
  
      btn.addEventListener("click", function () {
        // chỉ xử lý textarea / input có value
        if (!("value" in targetEl) || !targetEl.value) return;
  
        targetEl.focus();
        targetEl.select();
  
        let ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (e) {
          console.error(e);
        }
        if (!ok) return;
  
        // đổi icon + text
        btn.classList.add("is-copied");
        if (iconCopy)  iconCopy.style.display  = "none";
        if (iconCheck) iconCheck.style.display = "inline-flex";
        if (labelEl)   labelEl.textContent     = copiedLabel;
  
        // reset sau 1.5s
        clearTimeout(btn._copyTimeout);
        btn._copyTimeout = setTimeout(function () {
          btn.classList.remove("is-copied");
          if (iconCopy)  iconCopy.style.display  = "inline-flex";
          if (iconCheck) iconCheck.style.display = "none";
          if (labelEl)   labelEl.textContent     = defaultLabel;
        }, 1500);
      });
    }
  
    function attachClearButton(btn, textarea, badgeEl) {
      if (!btn || !textarea) return;
      btn.addEventListener("click", function () {
        textarea.value = "";
        textarea.focus();
        if (badgeEl) updateBadge(badgeEl, "");
      });
    }
  
    function attachSelectAllButton(btn, textarea) {
      if (!btn || !textarea) return;
      btn.addEventListener("click", function () {
        textarea.focus();
        textarea.select();
      });
    }
  
    /* ========= MAIN TABS (HTML / JS / CSS) ========= */
  
    const mainTabs = document.querySelectorAll(".main-tab");
    const panels   = document.querySelectorAll(".tool-panel");
  
    mainTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        mainTabs.forEach((b) => b.classList.toggle("active", b === btn));
        panels.forEach((p) =>
          p.classList.toggle("is-active", p.dataset.tab === tab)
        );
      });
    });
  
    // phơi helpers ra global để các file khác dùng
    window.ToolHelpers = {
      updateBadge,
      getIndentUnitFromValue,
      attachCopyButton,
      attachClearButton,
      attachSelectAllButton,
    };
});

// === THEME SWITCH (light / dark, ưu tiên system) ===
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".theme-toggle");
    const root = document.documentElement;
  
    const LS_KEY = "codebeautify-theme";
  
    // 1. Lấy theme thủ công đã lưu
    const saved = localStorage.getItem(LS_KEY);
  
    function applyTheme(mode, save = false) {
      root.setAttribute("data-theme", mode);
  
      btn.classList.remove("active-light", "active-dark");
      btn.classList.add(mode === "dark" ? "active-dark" : "active-light");
  
      if (save) localStorage.setItem(LS_KEY, mode);
    }
  
    // 2. Nếu user đã chọn thủ công
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else {
      // 3. System prefers-color-scheme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light");
  
      // Theo dõi thay đổi system
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
        if (!localStorage.getItem(LS_KEY)) {
          applyTheme(e.matches ? "dark" : "light");
        }
      });
    }
  
    // 4. Toggle thủ công
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  });
    
  