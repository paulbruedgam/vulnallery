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
      rights: "Each vulnerability's detail view names the designer, rights holder and licence of its logo, as far as they are known. If image rights have been violated, please let me know. Requirements will be met or the image will be removed.",
      contactTitle: "Contact",
      website: "Website",
      email: "Email",
      legalTitle: "Legal",
      imprint: "Legal notice",
      privacy: "Privacy policy",
      release: "Release",
      announce: "From 1 December: a new door every day in the advent calendar.",
      feed: "Subscribe to the feed (Atom)",
      adventTitle: "Advent calendar 2026",
      adventLede: "One door a day, each with the story behind a vulnerability logo.",
      adventArchive: "All doors so far",
      adventDoor: "Door",
      adventOpen: "Open door {n}",
      adventOpened: "Door {n}: {name}",
      adventLocked: "Door {n} opens on {n} December",
      adventToVuln: "To the vulnerability",
      adventToday: "Today",
      page: "Open page",
      colophon: "Plain HTML, CSS and JavaScript. No cookies, no trackers, no requests to other sites.",
      close: "Close",
      cveTitle: "CVE identifiers",
      noCve: "No CVE identifier has been assigned.",
      creditTitle: "Image rights",
      creditAuthor: "Design",
      creditHolder: "Rights holder",
      creditLicense: "Licence",
      creditSource: "Evidence",
      creditCommons: "according to Wikimedia Commons",
      lic: {
        "CC0": "CC0 1.0 – public domain dedication",
        "CC-BY-4.0": "CC BY 4.0",
        "CC-BY-2.5": "CC BY 2.5",
        "CC-BY-SA-4.0": "CC BY-SA 4.0",
        "MIT": "MIT License",
        "PD": "Public domain",
        "free": "Free to use according to the source, no licence named",
        "none": "No licence stated – all rights remain with the rights holder",
      },
      notes: {
        chromium: "Contains the Chromium logo (Google, CC BY 2.5).",
        safari: "Contains a modified Safari logo, which is in the public domain.",
        ai: "Created with the AI system DALL·E 2.",
        css: "The original exists only as styled text on the website; recreated here from its CSS (font Rubik Microbe, SIL OFL).",
      },
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
      rights: "Gestaltung, Rechteinhaber und Lizenz jedes Logos stehen, soweit bekannt, in der Detailansicht der Lücke. Falls Bildrechte verletzt werden, gib mir bitte Bescheid. Auflagen werden umgesetzt oder das Bild wird entfernt.",
      contactTitle: "Kontakt",
      website: "Website",
      email: "E-Mail",
      legalTitle: "Rechtliches",
      imprint: "Impressum",
      privacy: "Datenschutz",
      release: "Version",
      announce: "Ab 1. Dezember: jeden Tag ein Türchen im Adventskalender.",
      feed: "Feed abonnieren (Atom)",
      adventTitle: "Adventskalender 2026",
      adventLede: "Jeden Tag ein Türchen mit der Geschichte hinter einem Lücken-Logo.",
      adventArchive: "Alle bisherigen Türchen",
      adventDoor: "Türchen",
      adventOpen: "Türchen {n} öffnen",
      adventOpened: "Türchen {n}: {name}",
      adventLocked: "Türchen {n} öffnet am {n}. Dezember",
      adventToVuln: "Zur Lücke",
      adventToday: "Heute",
      page: "Eigene Seite öffnen",
      colophon: "Reines HTML, CSS und JavaScript. Keine Cookies, keine Tracker, keine Anfragen an andere Seiten.",
      close: "Schließen",
      cveTitle: "CVE-Kennungen",
      noCve: "Es wurde keine CVE-Kennung vergeben.",
      creditTitle: "Bildrechte",
      creditAuthor: "Gestaltung",
      creditHolder: "Rechteinhaber",
      creditLicense: "Lizenz",
      creditSource: "Nachweis",
      creditCommons: "laut Wikimedia Commons",
      lic: {
        "CC0": "CC0 1.0 – gemeinfrei",
        "CC-BY-4.0": "CC BY 4.0",
        "CC-BY-2.5": "CC BY 2.5",
        "CC-BY-SA-4.0": "CC BY-SA 4.0",
        "MIT": "MIT-Lizenz",
        "PD": "Gemeinfrei",
        "free": "Nutzung laut Quelle frei, ohne Lizenzangabe",
        "none": "Keine Lizenz angegeben – alle Rechte beim Rechteinhaber",
      },
      notes: {
        chromium: "Enthält das Chromium-Logo (Google, CC BY 2.5).",
        safari: "Enthält ein abgewandeltes Safari-Logo, das gemeinfrei ist.",
        ai: "Mit dem KI-System DALL·E 2 erstellt.",
        css: "Das Original ist nur ein gestalteter Schriftzug auf der Website; hier aus dessen CSS nachgebaut (Schrift Rubik Microbe, SIL OFL).",
      },
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

  const LICENSES = {
    "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
    "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC-BY-2.5": "https://creativecommons.org/licenses/by/2.5/",
    "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
    "MIT": "https://opensource.org/license/mit",
    "PD": null,
    "free": null,
    "none": null,
  };
  const NOTES = ["chromium", "safari", "ai", "css"];
  const str = (x, n = 120) => (typeof x === "string" && x.trim() ? x.trim().slice(0, n) : null);

  function cleanCredit(c) {
    if (!c || typeof c !== "object" || !Object.hasOwn(LICENSES, c.license)) return null;
    return {
      license: c.license,
      author: str(c.author),
      holder: str(c.holder),
      note: NOTES.includes(c.note) ? c.note : null,
      source: safeUrl(c.source),
      commons: c.commons === true,
    };
  }

  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const { id, name, date, image, url, category, cve = [], description = {}, added, darkBackground, credit, width, height, thumbs } = raw;
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
      credit: cleanCredit(credit),
      width: Number.isInteger(width) && width > 0 && width < 10000 ? width : null,
      height: Number.isInteger(height) && height > 0 && height < 10000 ? height : null,
      thumbs: Array.isArray(thumbs) ? thumbs.filter((w) => w === 200 || w === 400) : [],
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
    dCredit: $("#d-credit"),
    dCreditWrap: $("#d-credit-wrap"),
    dSrc: $("#d-src"),
    dPage: $("#d-page"),
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
    renderAnnounce();
    renderAdvent();
    const feed = $("#feed-link");
    if (feed) { feed.href = state.lang + "/feed.xml"; feed.title = t.feed; }
  }

  // ---------------------------------------------------------------- advent
  // Das Datum gilt in Berlin. Zum Testen: ?advent-date=2026-12-05
  const ADVENT_YEAR = 2026;
  // Feste, gemischte Reihenfolge der Türchen auf der Startseite
  const ADVENT_ORDER = [14, 3, 22, 9, 17, 1, 11, 20, 6, 24, 13, 4, 18, 8, 2, 23, 12, 7, 16, 21, 5, 19, 10, 15];
  const ADVENT_KEY = "vn-advent-" + ADVENT_YEAR;
  let advent = null;
  let lastDoor = 0;

  function berlinDate() {
    const forced = params.get("advent-date");
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(forced || "") ? forced
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const [y, m, d] = iso.split("-").map(Number);
    return { y, m, d };
  }
  const today = berlinDate();
  // Höchstes Türchen, das heute offen sein darf, oder 0 außerhalb des Kalenders
  const adventDay = today.y === ADVENT_YEAR && today.m === 12 && today.d <= 24 ? today.d : 0;
  const beforeAdvent = today.y < ADVENT_YEAR || (today.y === ADVENT_YEAR && today.m < 12);

  function renderAnnounce() {
    const box = $("#announce");
    if (box) box.hidden = !beforeAdvent;
  }

  const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));

  function openedDoors() {
    try {
      const list = JSON.parse(localStorage.getItem(ADVENT_KEY) || "[]");
      return new Set(Array.isArray(list) ? list.filter((n) => Number.isInteger(n) && n >= 1 && n <= adventDay) : []);
    } catch { return new Set(); }
  }
  function rememberDoor(n) {
    const set = openedDoors();
    set.add(n);
    store.set(ADVENT_KEY, JSON.stringify([...set].sort((a, b) => a - b)));
  }

  function cleanAdvent(raw) {
    if (!raw || raw.year !== ADVENT_YEAR || !Array.isArray(raw.doors)) return null;
    const doors = new Map();
    for (const d of raw.doors) {
      if (!d || !Number.isInteger(d.day) || d.day < 1 || d.day > 24 || !RE_ID.test(d.id)) continue;
      const v = all.find((x) => x.id === d.id);
      if (!v) continue;
      const txt = (o) => ({ de: str(o && o.de, 200) || "", en: str(o && o.en, 200) || "" });
      doors.set(d.day, { day: d.day, v, title: txt(d.title), text: { de: str(d.text && d.text.de, 800) || "", en: str(d.text && d.text.en, 800) || "" } });
    }
    return doors.size ? doors : null;
  }

  async function loadAdvent() {
    if (!adventDay) { adventLoaded = true; renderAdvent(); return; }
    try {
      const res = await fetch("data/advent.json", { credentials: "same-origin", cache: "no-cache" });
      if (!res.ok) { adventLoaded = true; renderAdvent(); return; }
      advent = cleanAdvent(await res.json());
    } catch { advent = null; }
    adventLoaded = true;
    renderAdvent();
  }

  let adventLoaded = false;
  function renderAdvent() {
    const box = $("#advent");
    if (!box) return;
    // Vor dem Laden bleibt der vom Build vorbereitete Kalender stehen
    if (!advent) { if (adventLoaded || !adventDay) box.hidden = true; return; }
    box.hidden = false;
    const t = T[state.lang];
    $("#advent-archive").href = `${state.lang}/advent/${ADVENT_YEAR}/`;
    const opened = openedDoors();
    const items = ADVENT_ORDER.map((n) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "door";
      b.dataset.day = String(n);
      const num = document.createElement("span");
      num.className = "door-num";
      num.textContent = String(n);
      const door = advent.get(n);
      if (n > adventDay || !door) {
        b.disabled = true;
        b.classList.add("locked");
        b.setAttribute("aria-label", fmt(t.adventLocked, { n }));
        b.append(num);
      } else if (opened.has(n)) {
        b.classList.add("open");
        b.setAttribute("aria-label", fmt(t.adventOpened, { n, name: door.v.name }));
        b.append(num, doorSticker(door.v));
      } else {
        b.setAttribute("aria-label", fmt(t.adventOpen, { n }));
        b.append(num);
      }
      if (n === adventDay) {
        b.classList.add("today");
        const tag = document.createElement("span");
        tag.className = "door-today";
        tag.textContent = t.adventToday;
        b.append(tag);
      }
      li.append(b);
      return li;
    });
    $("#doors").replaceChildren(...items);
  }

  function doorSticker(v) {
    const s = document.createElement("span");
    s.className = "sticker door-logo" + (v.dark ? " dark" : "");
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    if (v.width && v.height) { img.width = v.width; img.height = v.height; }
    setSrc(img, v, true);
    s.append(img);
    return s;
  }

  function openDoor(n) {
    const door = advent && advent.get(n);
    if (!door || n > adventDay) return;
    const t = T[state.lang];
    const first = !openedDoors().has(n);
    lastDoor = n;
    rememberDoor(n);
    const show = () => {
      const dlg = $("#advent-dlg");
      $("#a-day").textContent = `${t.adventDoor} ${n}`;
      $("#a-title").textContent = door.title[state.lang] || door.title.en;
      $("#a-text").textContent = door.text[state.lang] || door.text.en;
      $("#a-name").textContent = door.v.name;
      const st = $("#a-sticker");
      st.classList.toggle("dark", door.v.dark);
      setStickerImage(st, door.v);
      $("img", st).alt = `${door.v.name} logo`;
      const link = $("#a-link");
      link.href = pageHref(door.v.id);
      if (!dlg.open) dlg.showModal();
    };
    const btn = $(`.door[data-day="${n}"]`);
    if (first && btn && matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      btn.classList.add("opening");
      setTimeout(() => { renderAdvent(); show(); }, 650);
    } else {
      renderAdvent();
      show();
    }
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

  const pageHref = (id) => `${state.lang}/${id}/`;

  // „Neu“ gilt 30 Tage ab dem Erscheinen der Lücke (Feld date, Berliner Datum).
  // Ist nur Jahr oder Monat belegt, zählt der erste Tag des Zeitraums.
  const NEW_DAYS = 30;
  function isNew(v) {
    const [y, m = 1, d = 1] = v.date.split("-").map(Number);
    const days = (Date.UTC(today.y, today.m - 1, today.d) - Date.UTC(y, m - 1, d)) / 86400000;
    return days >= 0 && days < NEW_DAYS;
  }

  function setStickerImage(sticker, v) {
    const img = $("img", sticker);
    if (v.width && v.height) { img.width = v.width; img.height = v.height; }
    else { img.removeAttribute("width"); img.removeAttribute("height"); }
    setSrc(img, v, !sticker.classList.contains("big"));
    img.alt = sticker.classList.contains("big") ? `${v.name} logo` : "";
  }

  // Kacheln und Türchen laden die kleine Fassung, wenn es eine gibt
  function setSrc(img, v, small) {
    if (small && v.thumbs.length && v.width) {
      const base = v.image.replace(/\.[a-z0-9]+$/i, ".webp");
      img.srcset = [...v.thumbs.map((w) => `assets/img/${w}/${base} ${w}w`), `assets/img/${v.image} ${v.width}w`].join(", ");
      img.sizes = "(max-width: 640px) 44vw, 190px";
    } else {
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
    }
    img.src = "assets/img/" + v.image;
  }

  function fillCard(node, v, withNew) {
    const t = T[state.lang];
    node.href = pageHref(v.id);
    node.dataset.id = v.id;
    const sticker = $(".sticker", node);
    sticker.style.setProperty("--tilt", tilt(v.id));
    sticker.classList.toggle("dark", v.dark);
    setStickerImage(sticker, v);
    $(".name", node).textContent = v.name;
    const time = $("time", node);
    time.dateTime = v.date;
    time.textContent = v.year;
    const cat = $(".cat", node);
    cat.dataset.cat = v.category;
    cat.textContent = t.cats[v.category];
    if (withNew && isNew(v)) {
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
    if (params.has("advent-date")) p.set("advent-date", params.get("advent-date"));
    const qs = p.toString();
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  // ---------------------------------------------------------------- dialog
  function openDetail(id) {
    const v = all.find((x) => x.id === id);
    if (!v) return closeDetail();
    const t = T[state.lang];
    currentId = id;
    const big = $(".sticker", el.dlg);
    setStickerImage(big, v);
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
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = c;
      li.append(a);
      return li;
    }));
    el.dCveWrap.hidden = !v.cve.length;
    el.dNoCve.hidden = v.cve.length > 0;
    renderCredit(v.credit);
    el.dSrc.href = v.url;
    el.dPage.href = pageHref(v.id);
    el.dCopy.textContent = t.copy;
    const list = shown.some((x) => x.id === id) ? shown : all;
    const i = list.findIndex((x) => x.id === id);
    el.dPrev.disabled = i <= 0;
    el.dNext.disabled = i < 0 || i >= list.length - 1;
    el.dPrev.dataset.target = i > 0 ? list[i - 1].id : "";
    el.dNext.dataset.target = i >= 0 && i < list.length - 1 ? list[i + 1].id : "";
    if (!el.dlg.open) el.dlg.showModal();
  }

  function renderCredit(c) {
    const t = T[state.lang];
    el.dCreditWrap.hidden = !c;
    if (!c) return;
    const rows = [];
    const row = (label, ...content) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.append(...content);
      rows.push(dt, dd);
    };
    const link = (href, text) => {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = text;
      return a;
    };
    if (c.author) row(t.creditAuthor, c.author);
    if (c.holder) row(t.creditHolder, c.holder);
    const lic = LICENSES[c.license];
    row(t.creditLicense, lic ? link(lic, t.lic[c.license]) : t.lic[c.license]);
    if (c.note) row("", t.notes[c.note]);
    if (c.source) {
      const host = new URL(c.source).hostname.replace(/^www\./, "");
      const parts = [link(c.source, host)];
      if (c.commons) parts.push(" (" + t.creditCommons + ")");
      row(t.creditSource, ...parts);
    }
    el.dCredit.replaceChildren(...rows);
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

    const openCard = (e) => {
      const a = e.target.closest("a.card, a.t-item");
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(a.dataset.id);
    };
    el.wall.addEventListener("click", openCard);
    el.timeline.addEventListener("click", openCard);

    $("#doors").addEventListener("click", (e) => {
      const b = e.target.closest("button.door");
      if (b && !b.disabled) openDoor(Number(b.dataset.day));
    });
    $("#a-close").addEventListener("click", () => $("#advent-dlg").close());
    $("#advent-dlg").addEventListener("click", (e) => { if (e.target.id === "advent-dlg") e.target.close(); });
    $("#advent-dlg").addEventListener("close", () => {
      const btn = $(`.door[data-day="${lastDoor}"]`);
      if (btn) btn.focus({ preventScroll: true });
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
      const link = new URL(pageHref(currentId), location.href).href;
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
    loadAdvent();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
