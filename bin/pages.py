#!/usr/bin/env python3
"""Erzeugt die statischen Seiten von Vulnallery im fertigen Webroot.

    python3 bin/pages.py <WEBROOT> <VERSION> [<ZEITSTEMPEL>]

Wird von bin/build.sh auf die Kopie von src/ in dist/ angewendet, src/ bleibt
unverändert. Nur Python-Standardbibliothek, keine Abhängigkeiten.

Ergebnis im Webroot:
  de/<id>/index.html, en/<id>/index.html   eine Seite je Lücke und Sprache
  de/feed.xml, en/feed.xml                 Atom-Feeds (mit den geöffneten Türchen)
  de/advent/<jahr>/, en/advent/<jahr>/     Archiv des Adventskalenders, nur Türchen
                                           bis heute; advent/<jahr>/ leitet weiter
  sitemap.xml                              alle Seiten mit hreflang
  data/vulns.json                          ergänzt um width/height der Logos

Texte kommen aus dem Objekt T in assets/js/app.js, damit Galerie und Seiten
dieselben Bezeichnungen nutzen. Nur seitenspezifische Texte stehen unten.
"""
import datetime as dt
import html
import json
import os
import re
import struct
import sys

BASE = "https://vulnallery.de"
LANGS = ("de", "en")
CATS = ("hardware", "crypto", "wireless", "software", "network")
LICENSE_URLS = {
    "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
    "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC-BY-2.5": "https://creativecommons.org/licenses/by/2.5/",
    "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
    "PD": "https://creativecommons.org/publicdomain/mark/1.0/",
}
MONTHS = {
    "de": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
           "August", "September", "Oktober", "November", "Dezember"],
    "en": ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"],
}
# Nur hier gebraucht; alles andere steht in app.js.
PAGE = {
    "de": {
        "title": "{name} – Logo, CVE und Hintergrund | Vulnallery",
        "metaDesc": "{desc} Logo, CVE-Kennungen und Bildrechte von {name} in der Vulnallery.",
        "gallery": "Galerie",
        "back": "Zur Galerie",
        "logoAlt": "Logo von {name}",
        "other": "English",
        "otherLabel": "Diese Seite auf Englisch",
        "feedTitle": "Vulnallery – neue Sicherheitslücken mit Logo",
        "feedSub": "Neue Einträge in der Galerie der Sicherheitslücken mit eigenem Logo.",
        "skip": "Zum Inhalt springen",
        "archiveTitle": "Adventskalender {year} – alle Türchen | Vulnallery",
        "archiveDesc": "Der Adventskalender der Vulnallery: 24 Sicherheitslücken und die Geschichten hinter ihren Logos.",
        "archiveSoon": "Das erste Türchen öffnet am 1. Dezember {year}.",
        "archiveClosed": "Noch geschlossen",
        "doorFeed": "Türchen {n}: {title}",
    },
    "en": {
        "title": "{name} – logo, CVE and background | Vulnallery",
        "metaDesc": "{desc} Logo, CVE identifiers and image rights of {name} on Vulnallery.",
        "gallery": "Gallery",
        "back": "Back to the gallery",
        "logoAlt": "{name} logo",
        "other": "Deutsch",
        "otherLabel": "This page in German",
        "feedTitle": "Vulnallery – new vulnerabilities with a logo",
        "feedSub": "New entries in the gallery of vulnerabilities that come with their own logo.",
        "skip": "Skip to content",
        "archiveTitle": "Advent calendar {year} – all doors | Vulnallery",
        "archiveDesc": "The Vulnallery advent calendar: 24 vulnerabilities and the stories behind their logos.",
        "archiveSoon": "The first door opens on 1 December {year}.",
        "archiveClosed": "Still closed",
        "doorFeed": "Door {n}: {title}",
    },
}

esc = html.escape


# ------------------------------------------------------------------ texts
def load_texts(app_js):
    """Liest einfache Zeichenketten aus T in app.js (auch lic, notes, cats)."""
    out, lang, stack = {}, None, []
    for line in open(app_js, encoding="utf-8"):
        m = re.match(r"^    (de|en): \{$", line)
        if m:
            lang, stack = m.group(1), []
            out[lang] = {}
            continue
        if lang is None:
            continue
        if re.match(r"^    \},?$", line):
            lang = None
            continue
        m = re.match(r'^\s+(\w+): \{$', line)
        if m:
            stack.append(m.group(1))
            continue
        if re.match(r"^\s+\},?$", line) and stack:
            stack.pop()
            continue
        m = re.match(r'^\s+(\w+|"[^"]+"): "((?:[^"\\]|\\.)*)",?$', line)
        if m:
            key = m.group(1).strip('"')
            val = json.loads('"' + m.group(2) + '"')
            d = out[lang]
            for s in stack:
                d = d.setdefault(s, {})
            d[key] = val
    for lang in LANGS:
        for k in ("cats", "lic", "notes", "creditTitle", "cveTitle", "source", "release"):
            if k not in out.get(lang, {}):
                sys.exit(f"pages.py: Text '{k}' ({lang}) fehlt in app.js")
    return out


# ------------------------------------------------------------------ images
def image_size(path):
    """Breite und Höhe für PNG, JPEG, GIF, WebP und SVG, sonst None."""
    with open(path, "rb") as f:
        head = f.read(64)
        if head[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", head[16:24])
        if head[:6] in (b"GIF87a", b"GIF89a"):
            return struct.unpack("<HH", head[6:10])
        if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
            chunk = head[12:16]
            if chunk == b"VP8 ":
                w, h = struct.unpack("<HH", head[26:30])
                return w & 0x3FFF, h & 0x3FFF
            if chunk == b"VP8L":
                b = head[21:25]
                w = 1 + (((b[1] & 0x3F) << 8) | b[0])
                h = 1 + (((b[3] & 0xF) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6))
                return w, h
            if chunk == b"VP8X":
                w = 1 + int.from_bytes(head[24:27], "little")
                h = 1 + int.from_bytes(head[27:30], "little")
                return w, h
            return None
        if head[:2] == b"\xff\xd8":
            f.seek(2)
            while True:
                marker = f.read(2)
                if len(marker) < 2 or marker[0] != 0xFF:
                    return None
                if marker[1] in (0xD8, 0x01) or 0xD0 <= marker[1] <= 0xD7:
                    continue
                size = struct.unpack(">H", f.read(2))[0]
                if marker[1] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                                 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">HH", f.read(5)[1:5])
                    return w, h
                f.seek(size - 2, 1)
    if path.lower().endswith(".svg"):
        text = open(path, encoding="utf-8", errors="replace").read(4096)
        tag = re.search(r"<svg\b[^>]*>", text, re.S)
        if not tag:
            return None
        tag = tag.group(0)
        num = lambda a: (re.search(rf'\s{a}="\s*([\d.]+)\s*(?:px)?\s*"', tag) or [None, None])[1]
        w, h = num("width"), num("height")
        if w and h:
            return round(float(w)), round(float(h))
        vb = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', tag)
        if vb:
            return round(float(vb.group(1))), round(float(vb.group(2)))
    return None


# ------------------------------------------------------------------ helpers
def fmt_date(date, lang):
    parts = [int(p) for p in date.split("-")]
    y, m, d = (parts + [None, None])[:3]
    if not m:
        return str(y)
    month = MONTHS[lang][m - 1]
    if not d:
        return f"{month} {y}"
    return f"{d}. {month} {y}" if lang == "de" else f"{d} {month} {y}"


def iso(date):
    """YYYY, YYYY-MM oder YYYY-MM-DD als Zeitpunkt für Atom."""
    parts = (date.split("-") + ["01", "01"])[:3]
    return f"{parts[0]}-{parts[1]}-{parts[2]}T00:00:00Z"


def page_url(lang, vid):
    return f"{BASE}/{lang}/{vid}/"


def jsonld(obj):
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return s.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def credit_rows(c, t):
    rows = []
    if c.get("author"):
        rows.append((t["creditAuthor"], esc(c["author"])))
    if c.get("holder"):
        rows.append((t["creditHolder"], esc(c["holder"])))
    lic = c["license"]
    label = esc(t["lic"][lic])
    url = LICENSE_URLS.get(lic) if lic != "PD" else None
    rows.append((t["creditLicense"],
                 f'<a href="{esc(url)}" target="_blank" rel="noopener noreferrer">{label}</a>' if url else label))
    if c.get("note"):
        rows.append(("", esc(t["notes"][c["note"]])))
    if c.get("source"):
        host = re.sub(r"^www\.", "", re.match(r"https?://([^/]+)", c["source"]).group(1))
        extra = f' ({esc(t["creditCommons"])})' if c.get("commons") else ""
        rows.append((t["creditSource"],
                     f'<a href="{esc(c["source"])}" target="_blank" rel="noopener noreferrer">{esc(host)}</a>{extra}'))
    return "\n".join(f"            <dt>{esc(a)}</dt>\n            <dd>{b}</dd>" for a, b in rows)


def structured_data(v, lang, t, p, img_url, size):
    url = page_url(lang, v["id"])
    c = v["credit"]
    image = {
        "@type": "ImageObject",
        "@id": url + "#logo",
        "contentUrl": img_url,
        "url": img_url,
        "name": p["logoAlt"].format(name=v["name"]),
        "caption": v["description"][lang],
    }
    if size:
        image["width"], image["height"] = size
    if c.get("author"):
        image["creator"] = {"@type": "Person", "name": c["author"]}
    elif c.get("holder"):
        image["creator"] = {"@type": "Organization", "name": c["holder"]}
    if c.get("holder"):
        image["copyrightHolder"] = {"@type": "Organization", "name": c["holder"]}
        image["copyrightNotice"] = c["holder"]
    credit_text = c.get("author") or c.get("holder")
    if credit_text:
        image["creditText"] = credit_text
    if LICENSE_URLS.get(c["license"]):
        image["license"] = LICENSE_URLS[c["license"]]
    if c.get("source"):
        image["acquireLicensePage"] = c["source"]
    return [
        {"@context": "https://schema.org", "@type": "WebSite", "@id": BASE + "/#website",
         "name": "Vulnallery", "url": BASE + "/", "inLanguage": list(LANGS)},
        {"@context": "https://schema.org", "@type": "WebPage", "@id": url,
         "url": url, "name": p["title"].format(name=v["name"]),
         "description": v["description"][lang], "inLanguage": lang,
         "isPartOf": {"@id": BASE + "/#website"},
         "primaryImageOfPage": {"@id": url + "#logo"},
         "datePublished": v["date"]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Vulnallery", "item": f"{BASE}/?lang={lang}"},
            {"@type": "ListItem", "position": 2, "name": v["name"], "item": url}]},
        dict(image, **{"@context": "https://schema.org"}),
    ]


# ------------------------------------------------------------------ pages
def render_page(v, lang, ctx, prev_v, next_v):
    t, p = ctx["T"][lang], PAGE[lang]
    other = "en" if lang == "de" else "de"
    vid, name = v["id"], v["name"]
    desc = v["description"][lang] or v["description"]["en"]
    img_rel = "/assets/img/" + v["image"]
    size = ctx["sizes"].get(v["image"])
    wh = f' width="{size[0]}" height="{size[1]}"' if size else ""
    og_rel = f"/assets/og/{vid}.jpg" if os.path.exists(os.path.join(ctx["root"], "assets", "og", vid + ".jpg")) else "/assets/og-image.png"
    url = page_url(lang, vid)
    cves = "".join(
        f'\n            <li><a href="https://nvd.nist.gov/vuln/detail/{esc(c)}" target="_blank" rel="noopener noreferrer">{esc(c)}</a></li>'
        for c in v["cve"])
    cve_block = (f'          <h2 class="h3">{esc(t["cveTitle"])}</h2>\n          <ul class="cves">{cves}\n          </ul>'
                 if v["cve"] else f'          <p class="muted">{esc(t["noCve"])}</p>')
    nav = []
    if prev_v:
        nav.append(f'<a class="btn ghost" href="/{lang}/{prev_v["id"]}/" rel="prev"><span aria-hidden="true">‹ </span>{esc(prev_v["name"])}</a>')
    else:
        nav.append("<span></span>")
    if next_v:
        nav.append(f'<a class="btn ghost" href="/{lang}/{next_v["id"]}/" rel="next">{esc(next_v["name"])}<span aria-hidden="true"> ›</span></a>')
    title = p["title"].format(name=name)
    meta = p["metaDesc"].format(desc=desc, name=name)
    dark = " dark" if v.get("darkBackground") else ""
    return f"""<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="{esc(ctx["csp"])}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="color-scheme" content="dark light">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(meta)}">
  <link rel="canonical" href="{url}">
  <link rel="alternate" hreflang="{lang}" href="{url}">
  <link rel="alternate" hreflang="{other}" href="{page_url(other, vid)}">
  <link rel="alternate" hreflang="x-default" href="{page_url("de", vid)}">
  <link rel="alternate" type="application/atom+xml" title="{esc(p["feedTitle"])}" href="/{lang}/feed.xml">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Vulnallery">
  <meta property="og:locale" content="{"de_DE" if lang == "de" else "en_GB"}">
  <meta property="og:title" content="{esc(name)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{BASE}{og_rel}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(p["logoAlt"].format(name=name))}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/archivo-latin-wdth.woff2" as="font" type="font/woff2" crossorigin>
  {ctx["css_tag"]}
  {ctx["page_js_tag"]}
  <script type="application/ld+json">{jsonld(structured_data(v, lang, t, p, BASE + img_rel, size))}</script>
</head>
<body>
  <a class="skip" href="#main">{esc(p["skip"])}</a>

  <header class="top">
    <a class="brand" href="/?lang={lang}">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 3h15l8 8v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path class="fold" d="M21 3v5a3 3 0 0 0 3 3h5Z"/></svg>
      <span>Vulnallery</span>
    </a>
    <div class="toggles">
      <nav class="seg lang" aria-label="Language / Sprache">
        <a href="/de/{vid}/" hreflang="de" lang="de"{' aria-current="page"' if lang == "de" else ""}>DE</a>
        <a href="/en/{vid}/" hreflang="en" lang="en"{' aria-current="page"' if lang == "en" else ""}>EN</a>
      </nav>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="{esc(t["theme"])}" hidden>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path class="half" d="M12 3.5a8.5 8.5 0 0 1 0 17Z"/></svg>
      </button>
    </div>
  </header>

  <main id="main" class="vpage">
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="/?lang={lang}">Vulnallery</a></li>
        <li aria-current="page">{esc(name)}</li>
      </ol>
    </nav>

    <article class="vcard">
      <div class="d-inner">
        <div class="d-stage"><span class="sticker big{dark}"><img src="{img_rel}" alt="{esc(p["logoAlt"].format(name=name))}"{wh} decoding="async" fetchpriority="high"></span></div>
        <div class="d-body">
          <p class="meta"><time datetime="{esc(v["date"])}">{esc(fmt_date(v["date"], lang))}</time><a class="cat" data-cat="{v["category"]}" href="/?lang={lang}&amp;cat={v["category"]}">{esc(t["cats"][v["category"]])}</a></p>
          <h1>{esc(name)}</h1>
          <p class="d-desc">{esc(desc)}</p>
{cve_block}
          <h2 class="h3">{esc(t["creditTitle"])}</h2>
          <dl class="credit">
{credit_rows(v["credit"], t)}
          </dl>
          <div class="d-actions">
            <a class="btn primary" href="{esc(v["url"])}" target="_blank" rel="noopener noreferrer">{esc(t["source"])}</a>
            <a class="btn" href="/?lang={lang}">{esc(p["back"])}</a>
          </div>
          <nav class="d-nav" aria-label="{esc(p["gallery"])}">
            {nav[0]}
            {nav[1] if len(nav) > 1 else ""}
          </nav>
        </div>
      </div>
    </article>
  </main>

{ctx["footer"][lang]}
</body>
</html>
"""


def render_footer(lang, t, version):
    p = PAGE[lang]
    return f"""  <footer class="foot">
    <div class="foot-col">
      <h2>{esc(t["aboutTitle"])}</h2>
      <p>{esc(t["about"])}</p>
      <p>{esc(t["rights"])}</p>
    </div>
    <div class="foot-col">
      <h2>{esc(t["contactTitle"])}</h2>
      <dl class="contact">
        <dt>{esc(t["website"])}</dt>
        <dd><a href="https://www.bruedgam.eu" rel="noopener noreferrer">www.bruedgam.eu</a></dd>
        <dt>{esc(t["email"])}</dt>
        <dd><a href="mailto:info@vulnallery.de">info@vulnallery.de</a></dd>
      </dl>
    </div>
    <div class="legal">
      <nav aria-label="{esc(t["legalTitle"])}">
        <ul>
          <li><a href="https://www.bruedgam.eu/impressum/" rel="noopener noreferrer">{esc(t["imprint"])}</a></li>
          <li><a href="https://www.bruedgam.eu/datenschutz/" rel="noopener noreferrer">{esc(t["privacy"])}</a></li>
          <li><a class="feed-link" href="/{lang}/feed.xml" type="application/atom+xml" aria-label="{esc(t["feed"])}" title="{esc(t["feed"])}"><svg class="feed-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5a14.5 14.5 0 0 1 14.5 14.5M5 10a9 9 0 0 1 9 9"/><circle cx="6" cy="18" r="1.6"/></svg></a></li>
        </ul>
      </nav>
      <div class="colophon-wrap">
        <p class="colophon">{esc(t["colophon"])}</p>
        <p class="colophon release">{esc(t["release"])} <span translate="no">{esc(version)}</span></p>
      </div>
    </div>
  </footer>"""


# ------------------------------------------------------------------ feeds, sitemap
def render_feed(lang, items, ctx, doors=(), year=None, by_id=None):
    p = PAGE[lang]
    stamp = lambda v: iso(v["added"]) if v.get("added") else iso(v["date"])
    items = sorted(items, key=lambda v: (stamp(v), v["date"], v["name"]), reverse=True)[:30]
    updated = max([stamp(v) for v in items] + [door_published(year, d["day"]) for d in doors])
    entries = []
    for d in sorted(doors, key=lambda d: d["day"], reverse=True):
        v = by_id[d["id"]]
        url = archive_url(lang, year) + f"#tag-{d['day']}"
        when = door_published(year, d["day"])
        entries.append(f"""  <entry>
    <title>{esc(p["doorFeed"].format(n=d["day"], title=d["title"][lang]))}</title>
    <link rel="alternate" type="text/html" hreflang="{lang}" href="{url}"/>
    <link rel="related" type="text/html" href="{page_url(lang, v["id"])}"/>
    <id>{url}</id>
    <published>{when}</published>
    <updated>{when}</updated>
    <category term="advent" label="{esc(ctx["T"][lang]["adventTitle"])}"/>
    <summary type="text">{esc(d["text"][lang])}</summary>
  </entry>""")
    for v in items:
        url = page_url(lang, v["id"])
        entries.append(f"""  <entry>
    <title>{esc(v["name"])}</title>
    <link rel="alternate" type="text/html" hreflang="{lang}" href="{url}"/>
    <id>{url}</id>
    <published>{iso(v["date"])}</published>
    <updated>{stamp(v)}</updated>
    <category term="{v["category"]}" label="{esc(ctx["T"][lang]["cats"][v["category"]])}"/>
    <summary type="text">{esc(v["description"][lang])}</summary>
  </entry>""")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="{lang}">
  <title>{esc(p["feedTitle"])}</title>
  <subtitle>{esc(p["feedSub"])}</subtitle>
  <link rel="self" type="application/atom+xml" href="{BASE}/{lang}/feed.xml"/>
  <link rel="alternate" type="text/html" href="{BASE}/?lang={lang}"/>
  <id>{BASE}/{lang}/feed.xml</id>
  <updated>{updated}</updated>
  <author><name>Paul Brüdgam</name><uri>https://www.bruedgam.eu</uri></author>
  <icon>{BASE}/assets/favicon.svg</icon>
{chr(10).join(entries)}
</feed>
"""


def render_sitemap(items, lastmod, advent_year=None):
    urls = [f"""  <url>
    <loc>{BASE}/</loc>
    <lastmod>{lastmod}</lastmod>
  </url>"""]
    if advent_year:
        alts = "\n".join(
            f'    <xhtml:link rel="alternate" hreflang="{h}" href="{archive_url(l, advent_year)}"/>'
            for h, l in (("de", "de"), ("en", "en"), ("x-default", "de")))
        for lang in LANGS:
            urls.append(f"""  <url>
    <loc>{archive_url(lang, advent_year)}</loc>
    <lastmod>{lastmod}</lastmod>
{alts}
  </url>""")
    for v in items:
        alts = "\n".join(
            f'    <xhtml:link rel="alternate" hreflang="{h}" href="{page_url(l, v["id"])}"/>'
            for h, l in (("de", "de"), ("en", "en"), ("x-default", "de")))
        for lang in LANGS:
            urls.append(f"""  <url>
    <loc>{page_url(lang, v["id"])}</loc>
    <lastmod>{lastmod}</lastmod>
{alts}
  </url>""")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
{chr(10).join(urls)}
</urlset>
"""


# ------------------------------------------------------------------ advent
def advent_today(override=None):
    """Heutiges Datum in Berlin. Im Advent gilt dort immer MEZ (UTC+1)."""
    if override:
        return dt.date.fromisoformat(override)
    return (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)).date()


def open_doors(cal, by_id, today):
    """Türchen, die heute in Berlin schon offen sind, aufsteigend."""
    year = cal["year"]
    if today < dt.date(year, 12, 1):
        return []
    last = 24 if today > dt.date(year, 12, 24) else today.day
    return [d for d in sorted(cal["doors"], key=lambda d: d["day"]) if d["day"] <= last and d["id"] in by_id]


def door_published(year, day):
    # 00:00 Uhr in Berlin (MEZ) = 23:00 UTC am Vortag
    return (dt.datetime(year, 12, day, tzinfo=dt.timezone.utc) - dt.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")


def archive_url(lang, year):
    return f"{BASE}/{lang}/advent/{year}/"


def render_archive(lang, cal, doors, by_id, ctx):
    t, p = ctx["T"][lang], PAGE[lang]
    other = "en" if lang == "de" else "de"
    year = cal["year"]
    url = archive_url(lang, year)
    title = p["archiveTitle"].format(year=year)
    items = []
    for d in doors:
        v = by_id[d["id"]]
        size = ctx["sizes"].get(v["image"])
        wh = f' width="{size[0]}" height="{size[1]}"' if size else ""
        dark = " dark" if v.get("darkBackground") else ""
        items.append(f"""      <li class="archive-item vcard" id="tag-{d["day"]}">
        <div class="d-inner">
          <div class="d-stage"><span class="sticker big{dark}"><img src="/assets/img/{esc(v["image"])}" alt="{esc(p["logoAlt"].format(name=v["name"]))}"{wh} loading="lazy" decoding="async"></span></div>
          <div class="d-body">
            <p class="meta"><span>{esc(t["adventDoor"])} {d["day"]}</span><span class="a-name">{esc(v["name"])}</span></p>
            <h2>{esc(d["title"][lang])}</h2>
            <p class="d-desc">{esc(d["text"][lang])}</p>
            <div class="d-actions"><a class="btn primary" href="/{lang}/{esc(v["id"])}/">{esc(t["adventToVuln"])}</a></div>
          </div>
        </div>
      </li>""")
    shown = {d["day"] for d in doors}
    closed = [n for n in range(1, 25) if n not in shown]
    closed_html = ""
    if closed:
        closed_html = (f'\n    <h2 class="h3 archive-closed-title">{esc(p["archiveClosed"])}</h2>\n    <ul class="archive-closed">'
                       + "".join(f"<li>{n}</li>" for n in closed) + "</ul>")
    if items:
        body = '\n    <ol class="archive-list">\n' + "\n".join(items) + "\n    </ol>"
    else:
        body = f'\n    <p class="announce">{esc(p["archiveSoon"].format(year=year))}</p>'
    robots = "" if doors else '\n  <meta name="robots" content="noindex">'
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "@id": url, "url": url, "name": title,
           "description": p["archiveDesc"], "inLanguage": lang, "isPartOf": {"@id": BASE + "/#website"},
           "hasPart": [{"@type": "WebPage", "url": page_url(lang, d["id"]), "name": by_id[d["id"]]["name"]} for d in doors]},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Vulnallery", "item": f"{BASE}/?lang={lang}"},
              {"@type": "ListItem", "position": 2, "name": t["adventTitle"], "item": url}]}]
    return f"""<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="{esc(ctx["csp"])}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="color-scheme" content="dark light">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(p["archiveDesc"])}">{robots}
  <link rel="canonical" href="{url}">
  <link rel="alternate" hreflang="{lang}" href="{url}">
  <link rel="alternate" hreflang="{other}" href="{archive_url(other, year)}">
  <link rel="alternate" hreflang="x-default" href="{archive_url("de", year)}">
  <link rel="alternate" type="application/atom+xml" title="{esc(p["feedTitle"])}" href="/{lang}/feed.xml">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Vulnallery">
  <meta property="og:title" content="{esc(t["adventTitle"])}">
  <meta property="og:description" content="{esc(p["archiveDesc"])}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{BASE}/assets/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/archivo-latin-wdth.woff2" as="font" type="font/woff2" crossorigin>
  {ctx["css_tag"]}
  {ctx["page_js_tag"]}
  <script type="application/ld+json">{jsonld(ld)}</script>
</head>
<body>
  <a class="skip" href="#main">{esc(p["skip"])}</a>

  <header class="top">
    <a class="brand" href="/?lang={lang}">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 3h15l8 8v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path class="fold" d="M21 3v5a3 3 0 0 0 3 3h5Z"/></svg>
      <span>Vulnallery</span>
    </a>
    <div class="toggles">
      <nav class="seg lang" aria-label="Language / Sprache">
        <a href="/de/advent/{year}/" hreflang="de" lang="de"{' aria-current="page"' if lang == "de" else ""}>DE</a>
        <a href="/en/advent/{year}/" hreflang="en" lang="en"{' aria-current="page"' if lang == "en" else ""}>EN</a>
      </nav>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="{esc(t["theme"])}" hidden>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path class="half" d="M12 3.5a8.5 8.5 0 0 1 0 17Z"/></svg>
      </button>
    </div>
  </header>

  <main id="main" class="vpage">
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="/?lang={lang}">Vulnallery</a></li>
        <li aria-current="page">{esc(t["adventTitle"])}</li>
      </ol>
    </nav>
    <section class="intro">
      <h1>{esc(t["adventTitle"])}</h1>
      <p class="lede">{esc(t["adventLede"])}</p>
    </section>{body}{closed_html}
  </main>

{ctx["footer"][lang]}
</body>
</html>
"""


def render_redirect(year):
    target = archive_url("de", year)
    return f"""<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0; url=/de/advent/{year}/">
  <link rel="canonical" href="{target}">
  <title>Vulnallery – Adventskalender {year}</title>
</head>
<body>
  <p><a href="/de/advent/{year}/">Adventskalender {year}</a> · <a href="/en/advent/{year}/">Advent calendar {year}</a></p>
</body>
</html>
"""


# ------------------------------------------------------------------ main
def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    root, version = sys.argv[1], sys.argv[2]
    stamp = int(sys.argv[3]) if len(sys.argv) > 3 else int(dt.datetime.now(dt.timezone.utc).timestamp())
    lastmod = dt.datetime.fromtimestamp(stamp, dt.timezone.utc).strftime("%Y-%m-%d")

    index = open(os.path.join(root, "index.html"), encoding="utf-8").read()
    css_tag = re.search(r'<link rel="stylesheet" href="assets/css/style\.css[^>]*>', index).group(0).replace('href="assets/', 'href="/assets/')
    csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', index).group(1)
    page_js = os.path.join(root, "assets", "js", "page.js")
    page_404 = open(os.path.join(root, "404.html"), encoding="utf-8").read()
    m = re.search(r'<script src="/assets/js/page\.js[^>]*></script>', page_404)
    if not os.path.exists(page_js) or not m:
        sys.exit("pages.py: assets/js/page.js oder sein Script-Tag in 404.html fehlt")
    texts = load_texts(os.path.join(root, "assets", "js", "app.js"))

    data_path = os.path.join(root, "data", "vulns.json")
    items = json.load(open(data_path, encoding="utf-8"))
    sizes = {}
    for v in items:
        s = image_size(os.path.join(root, "assets", "img", v["image"]))
        if s:
            sizes[v["image"]] = s
            v["width"], v["height"] = s

    ctx = {
        "root": root, "T": texts, "sizes": sizes, "csp": csp, "css_tag": css_tag,
        "page_js_tag": m.group(0),
        "footer": {lang: render_footer(lang, texts[lang], version) for lang in LANGS},
    }
    order = sorted(items, key=lambda v: (v["date"], v["name"].lower()), reverse=True)
    by_id = {v["id"]: v for v in items}

    # Adventskalender: nur Türchen bis heute (Berlin) veröffentlichen.
    # Zum Testen: VULNALLERY_DATE=2026-12-05 ./bin/build.sh
    cal, doors = None, []
    cal_path = os.path.join(root, "data", "advent.json")
    if os.path.exists(cal_path):
        cal = json.load(open(cal_path, encoding="utf-8"))
        today = advent_today(os.environ.get("VULNALLERY_DATE"))
        doors = open_doors(cal, by_id, today)
        for lang in LANGS:
            out = os.path.join(root, lang, "advent", str(cal["year"]))
            os.makedirs(out, exist_ok=True)
            with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
                f.write(render_archive(lang, cal, doors, by_id, ctx))
        out = os.path.join(root, "advent", str(cal["year"]))
        os.makedirs(out, exist_ok=True)
        with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
            f.write(render_redirect(cal["year"]))

    for lang in LANGS:
        for i, v in enumerate(order):
            prev_v = order[i - 1] if i > 0 else None
            next_v = order[i + 1] if i + 1 < len(order) else None
            out = os.path.join(root, lang, v["id"])
            os.makedirs(out, exist_ok=True)
            with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
                f.write(render_page(v, lang, ctx, prev_v, next_v))
        with open(os.path.join(root, lang, "feed.xml"), "w", encoding="utf-8") as f:
            f.write(render_feed(lang, items, ctx, doors, cal and cal["year"], by_id))
    with open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(render_sitemap(order, lastmod, cal["year"] if doors else None))
    # Galerie bekommt die Bildmaße für width/height (gegen Layout-Sprünge)
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=1)
        f.write("\n")
    missing = sorted(v["image"] for v in items if v["image"] not in sizes)
    print(f"{len(order) * len(LANGS)} Seiten, 2 Feeds, sitemap.xml, Advent: {len(doors)} Türchen offen; Bildmaße für {len(sizes)}/{len(items)} Logos"
          + (f" (fehlen: {', '.join(missing)})" if missing else ""))


if __name__ == "__main__":
    main()
