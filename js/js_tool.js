// js_tool.js
document.addEventListener("DOMContentLoaded", function () {
    if (!window.ToolHelpers) return;
  
    const {
      updateBadge,
      getIndentUnitFromValue,
      attachCopyButton,
      attachClearButton,
      attachSelectAllButton,
    } = window.ToolHelpers;
  
    /* ========= JS BEAUTIFIER (ĐƠN GIẢN, AN TOÀN) ========= */
  
    const jsInput       = document.getElementById("js-input");
    const jsOutput      = document.getElementById("js-output");
    const jsBtnBeautify = document.getElementById("js-beautify");
    const jsBadge       = document.getElementById("js-length");
    const jsRemoveEmpty = document.getElementById("js-remove-empty");
  
    attachCopyButton(
      document.getElementById("js-copy"),
      jsOutput
    );
    attachClearButton(
      document.getElementById("js-clear"), 
      jsInput,
      jsBadge
    );
    attachSelectAllButton(
      document.getElementById("js-select-all"),
      jsInput
    );
  
    let jsIndent = "2";
    const jsIndentButtons = document.querySelectorAll(".indent-js");
    jsIndentButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        jsIndentButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        jsIndent = btn.getAttribute("data-indent-js") || "2";
      });
    });
  
    function beautifyJS(code, indentVal, removeEmptyLines) {
      if (!code) return "";
      const indentUnit = getIndentUnitFromValue(indentVal);
  
      // Chuẩn hóa xuống dòng
      code = code.replace(/\r\n?/g, "\n");
  
      // Bảo vệ pattern "});" thành token để không bị xé ra
      code = code.replace(/}\s*\);/g, "___JS_CLOSE_CB___");
  
      // ===== BƯỚC 1: TÁCH VÀ BẢO VỆ COMMENT // =====
      const inlineComments = []; // comment nằm cuối dòng code
      const lineComments   = []; // dòng chỉ có comment
  
      let rawLines = code.split("\n");
      let tmpLines = rawLines.map(function (line) {
        const idx = line.indexOf("//");
        if (idx !== -1) {
          const codePart = line.slice(0, idx);
          const comment  = line.slice(idx); // gồm cả //
  
          // Chỉ có comment trên dòng
          if (codePart.trim().length === 0) {
            const token = "___JS_CMT_LINE_" + lineComments.length + "___";
            lineComments.push(comment);
            return token;
          }
  
          // Comment inline cuối dòng code
          const token = "___JS_CMT_INLINE_" + inlineComments.length + "___";
          inlineComments.push(comment);
          return codePart + token;
        }
        return line;
      });
  
      // ===== BƯỚC 2: TÁCH DÒNG THEO DẤU ; (nhưng KHÔNG phá inline comment & token) =====
      const exploded = [];
      tmpLines.forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed) {
          exploded.push("");
          return;
        }
  
        // Nếu có inline comment token hoặc token đóng callback thì giữ nguyên, không split
        if (
          line.indexOf("___JS_CMT_INLINE_") !== -1 ||
          line.indexOf("___JS_CLOSE_CB___") !== -1
        ) {
          exploded.push(line);
          return;
        }
  
        // Còn lại tách statement theo ;
        let current = line;
        while (true) {
          const idx = current.indexOf(";");
          if (idx === -1) break;
  
          const before = current.slice(0, idx + 1); // gồm ;
          const after  = current.slice(idx + 1);
          exploded.push(before);
          current = after;
        }
        if (current.trim().length) {
          exploded.push(current);
        }
      });
  
      let lines = exploded.map(function (l) { return l.trim(); });
      if (removeEmptyLines) {
        lines = lines.filter(function (l) { return l.length > 0; });
      }
  
      // ===== BƯỚC 3: THỤT ĐẦU DÒNG THEO { } (tính cả token ___JS_CLOSE_CB___ là khối đóng) =====
      let indent = 0;
      const out = [];
  
      lines.forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (!removeEmptyLines) out.push("");
          return;
        }
  
        const isCloseCallback = trimmed.indexOf("___JS_CLOSE_CB___") !== -1;
  
        const opens  = (trimmed.match(/{/g) || []).length;
        const closes = (trimmed.match(/}/g) || []).length;
  
        const startsWithClosing =
          trimmed[0] === "}" ||
          trimmed === "});" ||
          trimmed === "})"  ||
          trimmed === "};"  ||
          /^}\)?;?$/.test(trimmed);
  
        // Giảm indent TRƯỚC khi in nếu là dòng đóng khối hoặc "});" token
        if (startsWithClosing || isCloseCallback) {
          indent = Math.max(indent - 1, 0);
        } else if (closes > opens) {
          indent = Math.max(indent - (closes - opens), 0);
        }
  
        const baseIndent = indentUnit.repeat(indent);
        let toPush = trimmed;
  
        // Dòng chain method: bắt đầu bằng "." => thụt thêm 1 indent unit
        if (trimmed[0] === ".") {
          toPush = indentUnit + trimmed;
        }
  
        out.push(baseIndent + toPush);
  
        // Tăng indent SAU khi in nếu có nhiều { hơn }
        const effOpens  = opens;
        const effCloses = closes + (isCloseCallback ? 1 : 0); // token "});" xem như 1 close
  
        if (effOpens > effCloses) {
          indent += (effOpens - effCloses);
        }
      });
  
      let result = out.join("\n");
  
      // ===== BƯỚC 4: THU GỌN DÒNG TRỐNG THÔ =====
      // Gom >= 3 dòng trống thành 1 dòng trống
      result = result.replace(/\n{3,}/g, "\n\n");
  
      if (removeEmptyLines) {
        // Nếu bật "Xóa khoảng cách mỗi dòng" -> bỏ luôn các dòng trống dư
        result = result.replace(/\n{2,}/g, "\n");
      }
  
      // ===== BƯỚC 5: TRẢ COMMENT VỀ ĐÚNG CHỖ =====
  
      // Comment inline: thêm 1 khoảng trắng trước //
      result = result.replace(/___JS_CMT_INLINE_(\d+)___/g, function (_, i) {
        const cmt = inlineComments[+i] || "";
        return " " + cmt.trim(); // code; // comment
      });
  
      // Comment nguyên dòng: giữ nguyên như cũ
      result = result.replace(/___JS_CMT_LINE_(\d+)___/g, function (_, i) {
        const cmt = lineComments[+i] || "";
        return cmt.trim();
      });
  
      // Trả token "});" về lại
      result = result.replace(/___JS_CLOSE_CB___/g, "});");
  
      // ===== BƯỚC 6: XOÁ DÒNG TRỐNG NGAY TRƯỚC COMMENT // =====
      (function fixBlankBeforeComment() {
        const linesArr   = result.split("\n");
        const cleanedArr = [];
  
        for (let i = 0; i < linesArr.length; i++) {
          const line    = linesArr[i];
          const trimmed = line.trim();
  
          // Nếu dòng hiện tại là comment //... và dòng trước đó là blank => bỏ blank
          if (
            trimmed.startsWith("//") &&
            cleanedArr.length > 0 &&
            cleanedArr[cleanedArr.length - 1].trim() === ""
          ) {
            cleanedArr.pop();
          }
  
          cleanedArr.push(line);
        }
  
        result = cleanedArr.join("\n");
      })();
  
      // ===== BƯỚC 7: XOÁ DÒNG TRỐNG GIỮA CÁC DÒNG CHAIN METHOD (BẮT ĐẦU BẰNG ".") =====
      (function fixBlankBetweenChains() {
        const linesArr = result.split("\n");
        const cleaned  = [];
  
        for (let i = 0; i < linesArr.length; i++) {
          const line    = linesArr[i];
          const trimmed = line.trim();
  
          // Nếu là dòng trống, và trước + sau đều là dòng bắt đầu bằng "."
          if (
            trimmed === "" &&
            i > 0 &&
            i < linesArr.length - 1 &&
            linesArr[i - 1].trim().startsWith(".") &&
            linesArr[i + 1].trim().startsWith(".")
          ) {
            // bỏ dòng trống này
            continue;
          }
  
          cleaned.push(line);
        }
  
        result = cleaned.join("\n");
      })();
  
      // ===== BƯỚC 8: XOÁ DÒNG TRỐNG GIỮA CÁC KHAI BÁO var/let/const LIỀN NHAU =====
      (function fixBlankBetweenVarGroup() {
        const linesArr = result.split("\n");
        const cleaned  = [];
  
        function isVarLike(s) {
          const t = s.trim();
          return (
            t.startsWith("var ") ||
            t.startsWith("let ") ||
            t.startsWith("const ")
          );
        }
  
        for (let i = 0; i < linesArr.length; i++) {
          const line    = linesArr[i];
          const trimmed = line.trim();
  
          if (
            trimmed === "" &&
            i > 0 &&
            i < linesArr.length - 1
          ) {
            const prev = linesArr[i - 1].trim();
            const next = linesArr[i + 1].trim();
  
            if (isVarLike(prev) && isVarLike(next)) {
              // bỏ dòng trống giữa 2 khai báo biến
              continue;
            }
          }
  
          cleaned.push(line);
        }
  
        result = cleaned.join("\n");
      })();
  
      return result.trim();
    }
  
    if (jsBtnBeautify) {
      jsBtnBeautify.addEventListener("click", () => {
        const result = beautifyJS(jsInput.value, jsIndent, jsRemoveEmpty.checked);
        jsOutput.value = result;
        updateBadge(jsBadge, result);
      });
    }
  });
  