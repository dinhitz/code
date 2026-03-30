// css-tool.js
(function () {
  function initCssTool() {
    if (!window.ToolHelpers) return;

    const root = document.querySelector('.tool-panel[data-tab="css"]');
    if (!root) return;
    if (root.dataset.toolInit === "1") return;

    const {
      updateBadge,
      getIndentUnitFromValue,
      attachCopyButton,
      attachClearButton,
      attachSelectAllButton,
    } = window.ToolHelpers;

    /* ========= CSS TOOL ========= */

    const cssInput  = document.getElementById("css-input");
    const cssOutput = document.getElementById("css-output");
    const cssBadge  = document.getElementById("badge-length");

    // panel chưa được inject xong
    if (!cssInput || !cssOutput) return;

    attachCopyButton(document.getElementById("btn-copy"), cssOutput);
    attachClearButton(document.getElementById("css-clear"), cssInput, cssBadge);
    attachSelectAllButton(document.getElementById("css-select-all"), cssInput);

    const btnToggleMinify   = document.getElementById("btn-toggle-minify");
    const btnToggleBeautify = document.getElementById("btn-toggle-beautify");
    const toggleSlider      = document.getElementById("toggle-slider");

  // NÉN
  const optRemoveComments = document.getElementById("opt-remove-comments");
  const optSuperCompact   = document.getElementById("opt-super-compact");
  const optKeepLastSemi   = document.getElementById("opt-keep-last-semicolon");
  const optKeepNewlineAt  = document.getElementById("opt-keep-newline-before-at");

  // LÀM ĐẸP
  const optRemoveCommentsBeautify = document.getElementById("opt-remove-comments-beautify");
  const optMultiSelector          = document.getElementById("opt-multi-selector");
  const optSpaceBetween           = document.getElementById("opt-space-between");
  const optSingleLineProp         = document.getElementById("opt-single-line-prop");
  const optRemoveLastSemiBeautify = document.getElementById("opt-remove-last-semicolon-beautify");
  const optRemoveLineGaps         = document.getElementById("opt-remove-line-gaps");

  const cssIndentButtons = document.querySelectorAll(".indent-css");
  let currentIndentCss   = "2";
  let currentCssMode     = "minify";

  function minifyCSS(css, opts) {
    if (!css) return "";

    // Chuẩn hóa xuống dòng
    css = css.replace(/\r\n?/g, "\n");

    // Xóa comment nếu chọn
    if (opts.removeComments) {
      css = css.replace(/\/\*[\s\S]*?\*\//g, "");
    }

    // Gom mọi khoảng trắng (kể cả xuống dòng) thành 1 space
    css = css.replace(/\s+/g, " ");

    // Ép sát quanh { } : ; , >
    css = css.replace(/\s*([{}:;,>+])\s*/g, "$1");

    // Sau block comment mà dính liền text thì chèn 1 space:
    // .../*do dam chu*/color:red  =>  .../*do dam chu*/ color:red
    css = css.replace(/\/\*([\s\S]*?)\*\/(?=\S)/g, "/*$1*/ ");

    // Bỏ dấu ; trước } nếu KHÔNG giữ chấm phẩy cuối
    if (!opts.keepLastSemi) {
      css = css.replace(/;}/g, "}");
    }

    // Nếu NÉN SIÊU GỌN => gom thành 1 dòng
    if (opts.superCompact) {
      // Ở mode này, không quan tâm newline @media nữa, cứ gom hết
      css = css.replace(/\s*\n+\s*/g, "");
      return css.trim();
    }

    // ----- MODE NÉN THƯỜNG (MỖI BLOCK 1 DÒNG, COMMENT RIÊNG DÒNG) -----

    // Nếu muốn giữ newline trước @media/@supports/@keyframes
    if (opts.keepNewlineAt) {
      css = css.replace(/\s*(@media|@supports|@keyframes)/g, "\n$1");
    }

    // Xuống dòng sau mỗi dấu }
    css = css.replace(/}\s*(?=[^\n])/g, "}\n");

    // Comment đứng ngay sau block: cho xuống dòng riêng
    // ví dụ: ...}/*li*/.contact...  =>  ...}\n/*li*/ \n.contact...
    css = css.replace(/}\n?(\/\*[^*]*\*\/)\s*/g, "}\n$1 \n");

    // Dọn bớt dòng trống thừa (nếu có)
    css = css.replace(/\n{3,}/g, "\n\n");

    return css.trim();
  }

  function formatPropertyBody(body, spaceBetween) {
    body = body.trim();
    if (!body) return "";
    if (spaceBetween) {
      body = body.replace(/\s*:\s*/g, ": ");
    } else {
      body = body.replace(/\s*:\s*/g, ":");
    }
    body = body.replace(/\s*;\s*/g, ";");
    return body;
  }

  function applyPropertySpacing(text, spaceBetween) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const original = lines[i];
      const trimmed  = original.trim();
      if (!trimmed) continue;

      // bỏ qua comment & @rule & block line
      if (
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("@") ||
        trimmed.includes("{") ||
        trimmed === "}" ||
        trimmed.indexOf("___CSS_COMMENT_") !== -1
      ) {
        continue;
      }

      if (!trimmed.includes(":")) continue;

      const indentMatch = original.match(/^\s*/);
      const indent      = indentMatch ? indentMatch[0] : "";
      let body          = trimmed;

      body      = formatPropertyBody(body, spaceBetween);
      lines[i]  = indent + body;
    }
    return lines.join("\n");
  }

  function applySingleLineProperties(text, options) {
    return text.replace(
      /([^\{\}\n]+)\{\s*\n\s*([^{}\n]+);\s*\n\s*}\s*/g,
      function (match, selectorPart, propLine) {
        const indentMatch = selectorPart.match(/^(\s*)/);
        const indent      = indentMatch ? indentMatch[1] : "";
        const selector    = selectorPart.replace(/^\s*/, "").trim();

        let body = propLine.trim();
        body     = formatPropertyBody(body, options.spaceBetween);

        const semi = options.removeLastSemi ? "" : ";";

        if (options.spaceBetween) {
          return indent + selector + " { " + body + semi + " }\n";
        } else {
          return indent + selector + " {" + body + semi + "}\n";
        }
      }
    );
  }

  function beautifyCSS(css, opt) {
    if (!css) return "";

    css = css.replace(/\r\n?/g, "\n");

    // COMMENT TOKEN
    let comments = [];
    if (opt.removeComments) {
      css = css.replace(/\/\*[\s\S]*?\*\//g, "");
    } else {
      css = css.replace(/\/\*[\s\S]*?\*\//g, function (match) {
        const token = "___CSS_COMMENT_" + comments.length + "___";
        comments.push(match);
        return token;
      });
    }

    // cấu trúc lại theo { } ;
    css = css
      .replace(/\s*{\s*/g, " {\n")
      // giữ comment inline trên cùng 1 dòng với thuộc tính
      .replace(/;\s*(?=___CSS_COMMENT_\d+___)/g, "; ")
      .replace(/;\s*/g, ";\n")
      .replace(/\s*}\s*/g, "\n}\n");

    let lines = css
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const indentUnit = getIndentUnitFromValue(currentIndentCss);
    let level        = 0;
    const out        = [];

    lines.forEach((line) => {
      // comment token nguyên dòng
      if (/^___CSS_COMMENT_\d+___$/.test(line)) {
        out.push(indentUnit.repeat(level) + line);
        return;
      }

      // chia đa bộ chọn
      if (opt.multiSelector && line.includes("{") && line.includes(",")) {
        const parts         = line.split("{");
        const selectorsPart = parts[0];
        const selectors     = selectorsPart.split(",").map((s) => s.trim());

        selectors.forEach((sel, i) => {
          let l = sel;
          if (i < selectors.length - 1) {
            l += ",";
          } else {
            l += " {";
          }
          const indent = indentUnit.repeat(level);
          out.push(indent + l);
        });
        level++;
        return;
      }

      if (line.startsWith("}")) {
        level = Math.max(level - 1, 0);
      }

      out.push(indentUnit.repeat(level) + line);

      if (line.endsWith("{")) {
        level++;
      }
    });

    let result = out.join("\n");

    // gộp block 1 thuộc tính thành 1 dòng
    if (opt.singleLineProp) {
      result = applySingleLineProperties(result, opt);
    }

    // khoảng cách thuộc tính : giá trị ;
    result = applyPropertySpacing(result, opt.spaceBetween);

    // bỏ dấu ; cuối khối nếu chọn
    if (opt.removeLastSemi) {
      result = result.replace(/;(\s*})/g, "$1");
    }

    // re-indent toàn bộ lần nữa cho chắc (khắc phục lệch trong @media)
    (function reindent() {
      const lines2 = result.split("\n");
      let lvl      = 0;
      const out2   = [];
      for (let i = 0; i < lines2.length; i++) {
        let raw     = lines2[i];
        let trimmed = raw.trim();
        if (!trimmed) {
          out2.push("");
          continue;
        }
        if (trimmed.startsWith("}")) {
          lvl = Math.max(lvl - 1, 0);
        }
        out2.push(indentUnit.repeat(lvl) + trimmed);
        if (trimmed.endsWith("{")) {
          lvl++;
        }
      }
      result = out2.join("\n");
    })();

    // trả comment về lại & xử lý khoảng trắng trước inline comment
    if (!opt.removeComments) {
      result = result.replace(/___CSS_COMMENT_(\d+)___/g, function (_, i) {
        return comments[+i] || "";
      });

      // ;/* => ; /*   và ;   /* => ; /*  (gom lại 1 khoảng trắng)
      result = result.replace(/;(\s*)\/\*/g, "; /*");
    }

    // normalize: bỏ whitespace thừa cuối mỗi dòng
    result = result
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/g, ""))
      .join("\n");

    // Khoảng cách giữa các block
    if (opt.removeLineGaps) {
      // "Xóa khoảng cách mỗi dòng" => không cho dòng trống
      result = result.replace(/\n\s*\n+/g, "\n");
    } else {
      // thêm 1 dòng trống giữa các block nếu sau "}" là một statement mới (không phải "}")
      result = result.replace(/}\n(?=[^\s}])/g, "}\n\n");
      // giới hạn tối đa 1 dòng trống
      result = result.replace(/\n{3,}/g, "\n\n");
    }

    return result.trim();
  }

  function setCssMode(mode) {
    currentCssMode = mode;
    if (!btnToggleMinify || !btnToggleBeautify || !toggleSlider) return;

    if (mode === "minify") {
      btnToggleMinify.classList.add("btn-toggle-active");
      btnToggleBeautify.classList.remove("btn-toggle-active");
      toggleSlider.style.transform = "translateX(0%)";
    } else {
      btnToggleBeautify.classList.add("btn-toggle-active");
      btnToggleMinify.classList.remove("btn-toggle-active");
      toggleSlider.style.transform = "translateX(100%)";
    }
  }

  function runMinify() {
    setCssMode("minify");
    const css  = cssInput.value;
    const opts = {
      removeComments: optRemoveComments.checked,
      superCompact:   optSuperCompact.checked,
      // ĐẢO NGHĨA: checkbox = "Xóa ; cuối"
      // Unchecked  => keepLastSemi = true  (GIỮ ;)
      // Checked    => keepLastSemi = false (XÓA ;)
      keepLastSemi:   !optKeepLastSemi.checked,
      keepNewlineAt:  optKeepNewlineAt.checked,
    };
    const result = minifyCSS(css, opts);
    cssOutput.value = result;
    updateBadge(cssBadge, result);
  }

  function runBeautify() {
    setCssMode("beautify");
    const css = cssInput.value;
    const opt = {
      removeComments:  optRemoveCommentsBeautify.checked,
      multiSelector:   optMultiSelector.checked,
      spaceBetween:    optSpaceBetween.checked,
      singleLineProp:  optSingleLineProp.checked,
      removeLastSemi:  optRemoveLastSemiBeautify.checked,
      removeLineGaps:  optRemoveLineGaps.checked,
    };
    const pretty = beautifyCSS(css, opt);
    cssOutput.value = pretty;
    updateBadge(cssBadge, pretty);
  }

  // === AUTO RUN KHI ĐANG Ở MODE HIỆN TẠI & ĐÃ CÓ CSS ===
  function autoRunCurrentMode() {
    if (!cssInput || !cssInput.value.trim()) return;
    if (currentCssMode === "beautify") {
      runBeautify();
    } else {
      runMinify();
    }
  }

  // thụt dòng: sau khi đổi indent thì tự chạy lại theo mode hiện tại
  cssIndentButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      cssIndentButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentIndentCss = btn.getAttribute("data-indent") || "2";
      autoRunCurrentMode();
    });
  });

  // auto-run cho các checkbox NÉN
  [
    optRemoveComments,
    optSuperCompact,
    optKeepLastSemi,
    optKeepNewlineAt,
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", autoRunCurrentMode);
  });

  // auto-run cho các checkbox LÀM ĐẸP
  [
    optRemoveCommentsBeautify,
    optMultiSelector,
    optSpaceBetween,
    optSingleLineProp,
    optRemoveLastSemiBeautify,
    optRemoveLineGaps,
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", autoRunCurrentMode);
  });

  // Nút chuyển mode vẫn giữ nguyên
  if (btnToggleMinify) {
    btnToggleMinify.addEventListener("click", runMinify);
  }
  if (btnToggleBeautify) {
    btnToggleBeautify.addEventListener("click", runBeautify);
  }

    setCssMode("minify");
    root.dataset.toolInit = "1";
  }

  // expose để gọi sau khi fetch inject panel
  window.initCssTool = initCssTool;

  // chạy nếu panel đã có sẵn trong DOM lúc load
  document.addEventListener("DOMContentLoaded", initCssTool);
})();
