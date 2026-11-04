/*
 * Vulnallery – kleines Script für die statischen Seiten (Lückenseiten, 404).
 * Übernimmt das gespeicherte Farbschema der Galerie und schaltet den
 * Umschalter frei. Ohne JavaScript folgt die Seite dem System-Farbschema.
 */
(() => {
  "use strict";
  const root = document.documentElement;
  const get = () => { try { return localStorage.getItem("vn-theme"); } catch { return null; } };
  const set = (v) => { try { localStorage.setItem("vn-theme", v); } catch { /* storage blocked */ } };
  const saved = get();
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;

  function bind() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      const current = root.dataset.theme ||
        (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      const next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      set(next);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
