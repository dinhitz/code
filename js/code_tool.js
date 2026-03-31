// code_tool.js
(function () {
  async function initCodeTool() {
    if (!window.ToolHelpers) return;

    const root = document.querySelector('.tool-panel[data-tab="code"]');
    if (!root) return;
    if (root.dataset.toolInit === "1") return;

    const { attachCopyButton } = window.ToolHelpers;
    const containers = {
      func: root.querySelector("#code-panel-func"),
      js: root.querySelector("#code-panel-js"),
      css: root.querySelector("#code-panel-css"),
    };

    function setActiveTab(tab) {
      const t = tab === "func" || tab === "js" || tab === "css" ? tab : "func";

      root.querySelectorAll(".code-subtab").forEach((btn) => {
        const isActive = btn.getAttribute("data-code-tab") === t;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });

      root.querySelectorAll(".code-tab-panel").forEach((panel) => {
        panel.classList.toggle(
          "is-active",
          panel.getAttribute("data-code-panel") === t
        );
      });
    }

    // tab con trong CODE
    root.querySelectorAll(".code-subtab[data-code-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setActiveTab(btn.getAttribute("data-code-tab"));
      });
    });

    // Load snippets and render cards
    try {
      const res = await fetch("partials/code-snippets.html", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const snippetHolders = Array.from(doc.querySelectorAll("div[id]")).filter(
        (el) => el && el.id && el.querySelector("textarea")
      );

      Object.values(containers).forEach((c) => {
        if (c) c.innerHTML = "";
      });

      function normalizeSnippet(text) {
        if (!text) return "";
        let t = String(text).replace(/\r\n?/g, "\n");

        // Trim only empty lines at start/end
        const lines0 = t.split("\n");
        while (lines0.length && lines0[0].trim() === "") lines0.shift();
        while (lines0.length && lines0[lines0.length - 1].trim() === "") lines0.pop();

        // Dedent by minimum leading spaces/tabs across non-empty lines
        let minIndent = Infinity;
        for (const line of lines0) {
          if (!line.trim()) continue;
          const m = line.match(/^[ \t]+/);
          if (!m) {
            minIndent = 0;
            break;
          }
          minIndent = Math.min(minIndent, m[0].length);
        }
        if (minIndent && minIndent !== Infinity) {
          return lines0.map((l) => (l.trim() ? l.slice(minIndent) : "")).join("\n");
        }
        return lines0.join("\n");
      }

      snippetHolders.forEach((holder, idx) => {
        const snippetTextarea = holder.querySelector("textarea");
        if (!snippetTextarea) return;

        const id = holder.id;
        const tabRaw = (holder.getAttribute("data-tab") || "").toLowerCase();
        const tab = tabRaw === "js" || tabRaw === "css" || tabRaw === "func" ? tabRaw : "func";
        const title = holder.getAttribute("data-title") || `Snippet ${idx + 1}`;
        const content = normalizeSnippet(snippetTextarea.textContent || "");

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
  <div class="card-header">
    <div class="card-title"></div>
    <div class="output-actions">
      <button
        class="copy-btn"
        type="button"
        data-copy-target="${id}"
        data-label-default="Sao chép mã"
        data-label-copied="Đã sao chép"
      >
        <span class="copy-btn__icon copy-default">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4
                     a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </span>
        <span class="copy-btn__icon copy-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span class="copy-btn__label">Sao chép mã</span>
      </button>
    </div>
  </div>
  <textarea class="card-content code-output" id="${id}" spellcheck="false" readonly wrap="off"></textarea>
        `.trim();

        card.querySelector(".card-title").textContent = title;
        const out = card.querySelector("textarea.code-output");
        out.value = content;

        const btn = card.querySelector('.copy-btn[data-copy-target]');
        attachCopyButton(btn, out);

        const targetContainer = containers[tab] || containers.html || root;
        targetContainer.appendChild(card);
      });

      // default: nếu có CSS snippets thì mở CSS, không thì FUNCTION
      const hasCss = containers.css && containers.css.children.length > 0;
      const hasJs = containers.js && containers.js.children.length > 0;
      const hasFunc = containers.func && containers.func.children.length > 0;
      if (hasCss) setActiveTab("css");
      else if (hasJs) setActiveTab("js");
      else if (hasFunc) setActiveTab("func");
    } catch (err) {
      console.error("Load code snippets failed:", err);
    }

    root.dataset.toolInit = "1";
  }

  window.initCodeTool = initCodeTool;
  document.addEventListener("DOMContentLoaded", initCodeTool);
})();

