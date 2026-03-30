// async function includeHTML(id, file) {
//     const el = document.getElementById(id);
//     if (!el) return;
  
//     try {
//       const res = await fetch(file);
//       const html = await res.text();
//       el.innerHTML = html;
//     } catch (err) {
//       console.error("Include error:", file, err);
//     }
//   }
  
//   async function loadAll() {
//     await includeHTML("html-panel-container", "partials/html-panel.html");
//     await includeHTML("js-panel-container", "partials/js-panel.html");
//     await includeHTML("css-panel-container", "partials/css-panel.html");
  
//     // ⚠️ QUAN TRỌNG: gọi lại init sau khi DOM đã có nội dung
//     if (window.initApp) window.initApp();
//   }
  
//   document.addEventListener("DOMContentLoaded", loadAll);

async function loadAll() {
await includeHTML("html-panel-container", "partials/html-panel.html");
await includeHTML("js-panel-container", "partials/js-panel.html");
await includeHTML("css-panel-container", "partials/css-panel.html");

// gọi init SAU khi load xong
if (window.initApp) window.initApp();
}

async function includeHTML(id, file) {
    const el = document.getElementById(id);
    if (!el) return;
  
    try {
      console.log("Loading:", file);
  
      const res = await fetch(file);
  
      console.log("Status:", res.status);
  
      const html = await res.text();
  
      console.log("Loaded content:", html.slice(0, 50));
  
      el.innerHTML = html;
    } catch (err) {
      console.error("Include error:", file, err);
    }
  }