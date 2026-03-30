// html_tool.js
(function () {
  function initHtmlTool() {
    if (!window.ToolHelpers) return;

    const root = document.querySelector('.tool-panel[data-tab="html"]');
    if (!root) return;
    if (root.dataset.toolInit === "1") return;

    const {
      updateBadge,
      getIndentUnitFromValue,
      attachCopyButton,
      attachClearButton,
      attachSelectAllButton,
    } = window.ToolHelpers;

    /* ========= HTML BEAUTIFIER ========= */

    const htmlInput       = document.getElementById("html-input");
    const htmlOutput      = document.getElementById("html-output");
    const htmlBtnBeautify = document.getElementById("html-beautify");
    const htmlBadge       = document.getElementById("html-length");
    const htmlRemoveEmpty = document.getElementById("html-remove-empty");

    // panel chưa được inject xong
    if (!htmlInput || !htmlOutput) return;

    attachCopyButton(
      document.getElementById("html-copy"),
      htmlOutput
    );
    attachClearButton(
      document.getElementById("html-clear"),
      htmlInput,
      htmlBadge
    );
    attachSelectAllButton(
      document.getElementById("html-select-all"),
      htmlInput
    );

    let htmlIndent = "2";
    const htmlIndentButtons = document.querySelectorAll(".indent-html");
    htmlIndentButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        htmlIndentButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        htmlIndent = btn.getAttribute("data-indent-html") || "2";
      });
    });

  /**
   * Beautify HTML:
   * - Doctype ở trên cùng
   * - <meta>, <link>, <br>, <img>, <hr>, <input> => dạng self-close: <tag ... />
   * - <title>, <h1>-<h6>, <button> => 1 dòng
   * - <p> với inline tag (<strong>, <em>, <span>...) => giữ nội dung 1 dòng, inline
   * - Comment: <!-- MAIN TABS -->
   */
  function beautifyHTML(html, indentVal, removeEmptyLines) {
    if (!html) return "";

    const indentUnit = getIndentUnitFromValue(indentVal);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const voidTags = new Set(["meta", "link", "br", "hr", "img", "input"]);
    const singleLineTags = new Set([
      "title",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "button",
    ]);
    const inlineTags = new Set(["strong", "em", "b", "i", "span", "a", "code"]);

    function attrsToString(el) {
      if (!el.attributes || !el.attributes.length) return "";
      return Array.from(el.attributes)
        .map((a) => `${a.name}="${a.value}"`)
        .join(" ");
    }

    // inline element -> trả về chuỗi không xuống dòng
    function formatInline(el) {
      const tag = el.tagName.toLowerCase();
      const attrs = attrsToString(el);
      const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
      const close = `</${tag}>`;

      let inner = "";
      el.childNodes.forEach((c) => {
        if (c.nodeType === Node.TEXT_NODE) {
          inner += c.textContent.replace(/\s+/g, " ");
        } else if (c.nodeType === Node.ELEMENT_NODE) {
          if (inlineTags.has(c.tagName.toLowerCase())) {
            inner += formatInline(c);
          } else {
            // Nếu lỡ có block bên trong, fallback outerHTML
            inner += c.outerHTML;
          }
        }
      });

      inner = inner.replace(/\s+/g, " ").trim();
      return open + inner + close;
    }

    function formatNode(node, level) {
      const pad = indentUnit.repeat(level);
      let out = "";

      // TEXT NODE
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\s+/g, " ").trim();
        if (text) out += pad + text + "\n";
        return out;
      }

      // COMMENT
      if (node.nodeType === Node.COMMENT_NODE) {
        const text = node.textContent.trim();
        out += pad + `<!-- ${text} -->\n`;
        return out;
      }

      // ELEMENT
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = attrsToString(node);
        const openStart = attrs ? `<${tag} ${attrs}` : `<${tag}`;

        // VOID TAGS: <meta ... />, <link ... />, ...
        if (voidTags.has(tag)) {
          out += pad + openStart + " />\n";
          return out;
        }

        const children = Array.from(node.childNodes);

        // TAG 1 DÒNG: title, h1-h6, button
        if (singleLineTags.has(tag)) {
          const text = node.textContent.replace(/\s+/g, " ").trim();
          out += pad + openStart + ">" + text + `</${tag}>\n`;
          return out;
        }

        // <p> đặc biệt: gom inline + text thành 1 dòng
        if (tag === "p") {
          let inner = "";
          children.forEach((c) => {
            if (c.nodeType === Node.TEXT_NODE) {
              inner += c.textContent.replace(/\s+/g, " ");
            } else if (c.nodeType === Node.ELEMENT_NODE) {
              const childTag = c.tagName.toLowerCase();
              if (inlineTags.has(childTag)) {
                inner += formatInline(c);
              } else {
                // nếu lỡ có block tag trong p => tách xuống dòng (hiếm)
                inner += "\n" + formatNode(c, level + 1);
              }
            } else if (c.nodeType === Node.COMMENT_NODE) {
              // comment trong <p> thì xuống dòng luôn
              inner += "\n" + indentUnit.repeat(level + 1) + `<!-- ${c.textContent.trim()} -->`;
            }
          });

          inner = inner.replace(/\s+/g, " ").trim();
          out += pad + openStart + ">" + inner + `</${tag}>\n`;
          return out;
        }

        // INLINE TAG đứng độc lập (rare) => gom 1 dòng
        if (inlineTags.has(tag)) {
          out += pad + formatInline(node) + "\n";
          return out;
        }

        // CÁC BLOCK TAG BÌNH THƯỜNG: div, body, head, html, ...
        out += pad + openStart + ">\n";
        children.forEach((c) => {
          out += formatNode(c, level + 1);
        });
        out += pad + `</${tag}>\n`;
        return out;
      }

      return out;
    }

    let result = "";

    // DOCTYPE
    if (doc.doctype) {
      result += "<!DOCTYPE " + doc.doctype.name + ">\n";
    } else {
      // nếu input không có doctype, thôi bỏ qua, không tự thêm
    }

    const htmlEl = doc.documentElement;
    if (htmlEl) {
      result += formatNode(htmlEl, 0);
    }

    // chỉnh lại khoảng trắng sau </head>
    result = result.replace(/<\/head>\n(\s*)<body>/, "</head>\n\n$1<body>");

    // gom bớt dòng trống (tối đa 1 dòng trống giữa block)
    result = result.replace(/\n{3,}/g, "\n\n");

    if (removeEmptyLines) {
      result = result.replace(/\n{2,}/g, "\n");
    }

    return result.trim();
  }

    if (htmlBtnBeautify) {
      htmlBtnBeautify.addEventListener("click", () => {
        const result = beautifyHTML(
          htmlInput.value,
          htmlIndent,
          htmlRemoveEmpty.checked
        );
        htmlOutput.value = result;
        updateBadge(htmlBadge, result);
      });
    }

    root.dataset.toolInit = "1";
  }

  window.initHtmlTool = initHtmlTool;
  document.addEventListener("DOMContentLoaded", initHtmlTool);
})();
