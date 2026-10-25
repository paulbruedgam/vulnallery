/*
 * Vulnallery – gallery of vulnerabilities with a logo.
 * Plain JavaScript, no dependencies. Content from data/vulns.json is only
 * ever written with textContent / validated attributes, never as HTML.
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------- i18n
  const T = {
    en: {
      title: "Vulnallery – the gallery of vulnerabilities",
      skip: "Skip to the gallery",
      theme: "Switch colour scheme",
      headline: "No critical vulnerability without a logo.",
      lede: (n, oldName, oldYear, newName, newYear) => [
        `${n} vulnerabilities with their own name and logo, from `,
        [oldName], ` (${oldYear}) to `, [newName], ` (${newYear}).`,
      ],
      filterHeading: "Filter the gallery",
      searchLabel: "Search by name, CVE or description",
      searchPlaceholder: "Search name, CVE or text",
      catGroup: "Category",
      all: "All",
      year: "Year",
      allYears: "All years",
      sort: "Sort",
      sortNew: "Newest first",
      sortOld: "Oldest first",
      sortAz: "A to Z",
      viewGroup: "View",
      viewGrid: "Sticker wall",
      viewTimeline: "Timeline",
      count: (shown, total) => shown === total
        ? `Showing all ${total} vulnerabilities`
        : `Showing ${shown} of ${total} vulnerabilities`,
      perYear: (n) => (n === 1 ? "1 vulnerability" : `${n} vulnerabilities`),
      emptyText: "No vulnerability matches these filters.",
      reset: "Reset filters",
      loadError: "The gallery could not be loaded. Reload the page to try again.",
      aboutTitle: "About",
      about: "Vulnallery is a fun project that collects vulnerabilities that come with a logo. Every logo belongs to its creators and links to the original source.",
      rights: "If image rights have been violated, please let me know. Requirements will be met or the image will be removed.",
      contactTitle: "Contact",
      issue: "Suggest a vulnerability or report a problem",
      colophon: "Plain HTML, CSS and JavaScript. No cookies, no trackers, no requests to other sites.",
      close: "Close",
      cveTitle: "CVE identifiers",
      noCve: "No CVE identifier has been assigned.",
      source: "Open original source",
      copy: "Copy link",
      copied: "Link copied",
      prev: "Previous",
      next: "Next",
      isNew: "New",
      cats: {
        hardware: "CPU & hardware",
        crypto: "TLS & crypto",
        wireless: "Wireless",
        software: "Software",
        network: "Network",
      },
    },
    de: {
      title: "Vulnallery – die Galerie der Sicherheitslücken",
      skip: "Zur Galerie springen",
      theme: "Farbschema wechseln",
      headline: "Keine kritische Lücke ohne Logo.",
      lede: (n, oldName, oldYear, newName, newYear) => [
        `${n} Sicherheitslücken mit eigenem Namen und Logo, von `,
        [oldName], ` (${oldYear}) bis `, [newName], ` (${newYear}).`,
      ],
      filterHeading: "Galerie filtern",
      searchLabel: "Nach Name, CVE oder Beschreibung suchen",
      searchPlaceholder: "Name, CVE oder Text suchen",
      catGroup: "Kategorie",
      all: "Alle",
      year: "Jahr",
      allYears: "Alle Jahre",
      sort: "Sortierung",
      sortNew: "Neueste zuerst",
      sortOld: "Älteste zuerst",
      sortAz: "A bis Z",
      viewGroup: "Ansicht",
      viewGrid: "Stickerwand",
      viewTimeline: "Zeitleiste",
      count: (shown, total) => shown === total
        ? `Alle ${total} Lücken`
        : `${shown} von ${total} Lücken`,
      perYear: (n) => (n === 1 ? "1 Lücke" : `${n} Lücken`),
      emptyText: "Keine Lücke passt zu diesen Filtern.",
      reset: "Filter zurücksetzen",
      loadError: "Die Galerie konnte nicht geladen werden. Lade die Seite neu, um es noch einmal zu versuchen.",
      aboutTitle: "Über Vulnallery",
      about: "Vulnallery ist ein Spaßprojekt, das Sicherheitslücken mit eigenem Logo sammelt. Alle Logos gehören ihren Urhebern und verlinken auf die Originalquelle.",
      rights: "Falls Bildrechte verletzt werden, gib mir bitte Bescheid. Auflagen werden umgesetzt oder das Bild wird entfernt.",
      contactTitle: "Kontakt",
      issue: "Lücke vorschlagen oder Problem melden",
      colophon: "Reines HTML, CSS und JavaScript. Keine Cookies, keine Tracker, keine Anfragen an andere Seiten.",
      close: "Schließen",
      cveTitle: "CVE-Kennungen",
      noCve: "Es wurde keine CVE-Kennung vergeben.",
      source: "Originalquelle öffnen",
      copy: "Link kopieren",
      copied: "Link kopiert",
      prev: "Vorherige",
      next: "Nächste",
      isNew: "Neu",
      cats: {
        hardware: "CPU & Hardware",
        crypto: "TLS & Krypto",
        wireless: "Funk",
        software: "Software",
        network: "Netzwerk",
      },
    },
  };
  const LANGS = Object.keys(T);
  const CATS = ["hardware", "crypto", "wireless", "software", "network"];
  const SORTS = ["new", "old", "az"];
  const VIEWS = ["grid", "timeline"];

  // ---------------------------------------------------------------- helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };

  const RE_ID = /^[a-z0-9-]{1,48}$/;
  const RE_IMG = /^[a-z0-9._-]{1,64}\.(?:png|jpe?g|svg|webp|gif)$/i;
  const RE_DATE = /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
  const RE_CVE = /^CVE-\d{4}-\d{4,7}$/;

  function safeUrl(u) {
    try {
      const url = new URL(u);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch { return null; }
  }

  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const { id, name, date, image, url, category, cve = [], description = {}, added, darkBackground } = raw;
    if (!RE_ID.test(id) || typeof name !== "string" || !name.trim()) return null;
    if (!RE_DATE.test(date) || !RE_IMG.test(image) || !CATS.includes(category)) return null;
    const href = safeUrl(url);
    if (!href) return null;
    return {
      id,
      name: name.trim().slice(0, 80),
      date,
      year: date.slice(0, 4),
      image,
      url: href,
      category,
      cve: Array.isArray(cve) ? cve.filter((c) => RE_CVE.test(c)) : [],
      description: {
        en: typeof description.en === "string" ? description.en : "",
        de: typeof description.de === "string" ? description.de : "",
      },
      added: typeof added === "string" ? added : null,
      dark: darkBackground === true,
    };
  }

  // Deterministic tilt per entry, so the wall looks hand-placed but stable.
  function tilt(id) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (((h >>> 0) % 700) / 100 - 3.5).toFixed(2) + "deg";
  }

  function fmtDate(date, lang) {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    const opts = { timeZone: "UTC", year: "numeric" };
    if (m) opts.month = "long";
    if (d) opts.day = "numeric";
    return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", opts).format(dt);
  }

  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

  // ---------------------------------------------------------------- state
  const params = new URLSearchParams(location.search);
  const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

  const browserLang = (navigator.languages || [navigator.language || "en"])
    .map((l) => l.slice(0, 2).toLowerCase()).find((l) => LANGS.includes(l));

  const state = {
    lang: pick(params.get("lang"), LANGS, pick(store.get("vn-lang"), LANGS, browserLang || "en")),
    q: (params.get("q") || "").slice(0, 80),
    cat: pick(params.get("cat"), CATS, "all"),
    year: /^\d{4}$/.test(params.get("year") || "") ? params.get("year") : "all",
    sort: pick(params.get("sort"), SORTS, "new"),
    view: pick(params.get("view"), VIEWS, "grid"),
  };

  let all = [];
  let shown = [];
  let currentId = null;

  // ---------------------------------------------------------------- theme
  const root = document.documentElement;
  const savedTheme = store.get("vn-theme");
  if (savedTheme === "light" || savedTheme === "dark") root.dataset.theme = savedTheme;

  function effectiveTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  // ---------------------------------------------------------------- DOM refs
  const el = {
    lede: $("#lede"),
    q: $("#q"),
    cats: $("#cats"),
    year: $("#year"),
    sort: $("#sort"),
    count: $("#count"),
    wall: $("#gallery"),
    timeline: $("#timeline"),
    empty: $("#empty"),
    error: $("#error"),
    tpl: $("#card-tpl"),
    dlg: $("#detail"),
    dImg: $("#d-img"),
    dDate: $("#d-date"),
    dCat: $("#d-cat"),
    dName: $("#d-name"),
    dDesc: $("#d-desc"),
    dCves: $("#d-cves"),
    dCveWrap: $("#d-cve-wrap"),
    dNoCve: $("#d-nocve"),
    dSrc: $("#d-src"),
    dCopy: $("#d-copy"),
    dPrev: $("#d-prev"),
    dNext: $("#d-next"),
  };

  // ---------------------------------------------------------------- text
  function applyStaticText() {
    const t = T[state.lang];
    root.lang = state.lang;
    document.title = t.title;
    $$("[data-i18n]").forEach((n) => {
      const v = t[n.dataset.i18n];
      if (typeof v === "string") n.textContent = v;
    });
    $$("[data-i18n-aria]").forEach((n) => {
      const v = t[n.dataset.i18nAria];
      if (typeof v === "string") n.setAttribute("aria-label", v);
    });
    $$("[data-i18n-placeholder]").forEach((n) => {
      const v = t[n.dataset.i18nPlaceholder];
      if (typeof v === "string") n.setAttribute("placeholder", v);
    });
    $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  }

  function renderLede() {
    if (!all.length) return;
    const byDate = [...all].sort((a, b) => a.date.localeCompare(b.date));
    const oldest = byDate[0];
    const newest = byDate[byDate.length - 1];
    const parts = T[state.lang].lede(all.length, oldest.name, oldest.year, newest.name, newest.year);
    el.lede.replaceChildren(...parts.map((p) => {
      if (Array.isArray(p)) { const s = document.createElement("strong"); s.textContent = p[0]; return s; }
      return document.createTextNode(p);
    }));
  }

  function renderChips() {
    const t = T[state.lang];
    const counts = Object.fromEntries(CATS.map((c) => [c, all.filter((v) => v.category === c).length]));
    const make = (key, label, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.value = key;
      if (key !== "all") b.dataset.cat = key;
      b.setAttribute("aria-pressed", String(state.cat === key));
      const l = document.createElement("span");
      l.textContent = label;
      const c = document.createElement("span");
      c.className = "n";
      c.textContent = String(n);
      b.append(l, c);
      return b;
    };
    el.cats.replaceChildren(make("all", t.all, all.length), ...CATS.map((c) => make(c, t.cats[c], counts[c])));
  }

  function renderYears() {
    const t = T[state.lang];
    const years = [...new Set(all.map((v) => v.year))].sort().reverse();
    if (state.year !== "all" && !years.includes(state.year)) state.year = "all";
    const opts = [["all", t.allYears], ...years.map((y) => [y, y])].map(([v, l]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = l;
      return o;
    });
    el.year.replaceChildren(...opts);
    el.year.value = state.year;
  }

  // ---------------------------------------------------------------- filter
  function filtered() {
    const q = norm(state.q.trim());
    let list = all.filter((v) =>
      (state.cat === "all" || v.category === state.cat) &&
      (state.year === "all" || v.year === state.year) &&
      (!q || norm([v.name, v.id, v.cve.join(" "), v.description[state.lang]].join(" ")).includes(q)));
    const byName = (a, b) => a.name.localeCompare(b.name, state.lang, { sensitivity: "base" });
    if (state.sort === "new") list.sort((a, b) => b.date.localeCompare(a.date) || byName(a, b));
    if (state.sort === "old") list.sort((a, b) => a.date.localeCompare(b.date) || byName(a, b));
    if (state.sort === "az") list.sort(byName);
    return list;
  }

  function fillCard(node, v, withNew) {
    const t = T[state.lang];
    node.href = "#" + v.id;
    node.dataset.id = v.id;
    const sticker = $(".sticker", node);
    sticker.style.setProperty("--tilt", tilt(v.id));
    sticker.classList.toggle("dark", v.dark);
    const img = $("img", sticker);
    img.src = "assets/img/" + v.image;
    $(".name", node).textContent = v.name;
    const time = $("time", node);
    time.dateTime = v.date;
    time.textContent = v.year;
    const cat = $(".cat", node);
    cat.dataset.cat = v.category;
    cat.textContent = t.cats[v.category];
    if (withNew && v.added) {
      const tag = document.createElement("span");
      tag.className = "new-tag";
      tag.textContent = t.isNew;
      node.append(tag);
    }
    return node;
  }

  function renderGrid() {
    const frag = document.createDocumentFragment();
    for (const v of shown) frag.append(fillCard(el.tpl.content.firstElementChild.cloneNode(true), v, true));
    el.wall.replaceChildren(frag);
  }

  function renderTimeline() {
    const t = T[state.lang];
    const groups = new Map();
    for (const v of shown) {
      if (!groups.has(v.year)) groups.set(v.year, []);
      groups.get(v.year).push(v);
    }
    const frag = document.createDocumentFragment();
    for (const [year, items] of groups) {
      const sec = document.createElement("section");
      sec.className = "t-year";
      const h = document.createElement("h2");
      h.textContent = year;
      const small = document.createElement("small");
      small.textContent = t.perYear(items.length);
      h.append(small);
      const ul = document.createElement("ul");
      ul.className = "t-list";
      for (const v of items) {
        const li = document.createElement("li");
        const a = fillCard(el.tpl.content.firstElementChild.cloneNode(true), v, false);
        a.className = "t-item";
        $("time", a).textContent = fmtDate(v.date, state.lang);
        li.append(a);
        ul.append(li);
      }
      sec.append(h, ul);
      frag.append(sec);
    }
    el.timeline.replaceChildren(frag);
  }

  function render() {
    shown = filtered();
    el.count.textContent = T[state.lang].count(shown.length, all.length);
    $$(".chip", el.cats).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === state.cat)));
    $$("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    const isGrid = state.view === "grid";
    el.wall.hidden = !isGrid || !shown.length;
    el.timeline.hidden = isGrid || !shown.length;
    el.empty.hidden = shown.length > 0;
    if (isGrid) renderGrid(); else renderTimeline();
    syncUrl();
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.cat !== "all") p.set("cat", state.cat);
    if (state.year !== "all") p.set("year", state.year);
    if (state.sort !== "new") p.set("sort", state.sort);
    if (state.view !== "grid") p.set("view", state.view);
    if (params.has("lang")) p.set("lang", state.lang);
    const qs = p.toString();
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  // ---------------------------------------------------------------- dialog
  function openDetail(id) {
    const v = all.find((x) => x.id === id);
    if (!v) return closeDetail();
    const t = T[state.lang];
    currentId = id;
    el.dImg.src = "assets/img/" + v.image;
    el.dImg.alt = `${v.name} logo`;
    const big = $(".sticker", el.dlg);
    big.style.setProperty("--tilt", tilt(v.id));
    big.classList.toggle("dark", v.dark);
    el.dDate.dateTime = v.date;
    el.dDate.textContent = fmtDate(v.date, state.lang);
    el.dCat.dataset.cat = v.category;
    el.dCat.textContent = t.cats[v.category];
    el.dName.textContent = v.name;
    el.dDesc.textContent = v.description[state.lang] || v.description.en;
    el.dCves.replaceChildren(...v.cve.map((c) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "https://nvd.nist.gov/vuln/detail/" + c;
      a.rel = "noopener noreferrer";
      a.textContent = c;
      li.append(a);
      return li;
    }));
    el.dCveWrap.hidden = !v.cve.length;
    el.dNoCve.hidden = v.cve.length > 0;
    el.dSrc.href = v.url;
    el.dCopy.textContent = t.copy;
    const list = shown.some((x) => x.id === id) ? shown : all;
    const i = list.findIndex((x) => x.id === id);
    el.dPrev.disabled = i <= 0;
    el.dNext.disabled = i < 0 || i >= list.length - 1;
    el.dPrev.dataset.target = i > 0 ? list[i - 1].id : "";
    el.dNext.dataset.target = i >= 0 && i < list.length - 1 ? list[i + 1].id : "";
    if (!el.dlg.open) el.dlg.showModal();
  }

  function closeDetail() {
    currentId = null;
    if (el.dlg.open) el.dlg.close();
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
  }

  function fromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (RE_ID.test(id) && all.some((v) => v.id === id)) openDetail(id);
    else if (el.dlg.open) closeDetail();
  }

  function go(id) {
    if (id) location.hash = id;
  }

  // ---------------------------------------------------------------- events
  function bind() {
    $$("[data-lang]").forEach((b) => b.addEventListener("click", () => {
      state.lang = b.dataset.lang;
      store.set("vn-lang", state.lang);
      if (params.has("lang")) params.set("lang", state.lang);
      applyStaticText();
      renderLede();
      renderChips();
      renderYears();
      render();
      if (currentId) openDetail(currentId);
    }));

    $("#theme-toggle").addEventListener("click", () => {
      const next = effectiveTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      store.set("vn-theme", next);
    });

    let timer;
    el.q.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = el.q.value.slice(0, 80); render(); }, 120);
    });

    el.cats.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      state.cat = b.dataset.value;
      render();
    });
    el.year.addEventListener("change", () => { state.year = el.year.value; render(); });
    el.sort.addEventListener("change", () => { state.sort = pick(el.sort.value, SORTS, "new"); render(); });
    $$("[data-view]").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; render(); }));

    $("#reset").addEventListener("click", () => {
      Object.assign(state, { q: "", cat: "all", year: "all", sort: "new" });
      el.q.value = "";
      el.year.value = "all";
      el.sort.value = "new";
      render();
      el.q.focus();
    });

    window.addEventListener("hashchange", fromHash);
    $("#d-close").addEventListener("click", closeDetail);
    el.dlg.addEventListener("close", () => { if (currentId) closeDetail(); });
    el.dlg.addEventListener("click", (e) => { if (e.target === el.dlg) closeDetail(); });
    el.dlg.addEventListener("keydown", (e) => {
      if (e.target.closest("input, select")) return;
      if (e.key === "ArrowLeft") go(el.dPrev.dataset.target);
      if (e.key === "ArrowRight") go(el.dNext.dataset.target);
    });
    el.dPrev.addEventListener("click", () => go(el.dPrev.dataset.target));
    el.dNext.addEventListener("click", () => go(el.dNext.dataset.target));
    el.dCopy.addEventListener("click", async () => {
      const link = location.origin + location.pathname + "#" + currentId;
      try {
        await navigator.clipboard.writeText(link);
        el.dCopy.textContent = T[state.lang].copied;
      } catch {
        el.dCopy.textContent = link;
      }
    });
  }

  // ---------------------------------------------------------------- start
  async function start() {
    applyStaticText();
    el.q.value = state.q;
    el.sort.value = state.sort;
    bind();
    try {
      const res = await fetch("data/vulns.json", { credentials: "same-origin", cache: "no-cache" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const list = Array.isArray(data) ? data : Object.values(data);
      const seen = new Set();
      all = list.map(clean).filter((v) => v && !seen.has(v.id) && seen.add(v.id));
    } catch (err) {
      el.error.textContent = T[state.lang].loadError;
      el.error.hidden = false;
      el.wall.hidden = true;
      return;
    }
    renderLede();
    renderChips();
    renderYears();
    render();
    fromHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
