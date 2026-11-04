#!/usr/bin/env python3
"""Erzeugt die Vorschaubilder (1200 × 630) für die Lückenseiten.

    python3 bin/gen_og.py            fehlende Bilder erzeugen
    python3 bin/gen_og.py --all      alle neu erzeugen
    python3 bin/gen_og.py heartbleed ...  nur diese Lücken

Ergebnis: src/assets/og/<id>.jpg, wird eingecheckt. Nach jedem neuen Eintrag
ausführen. Der Build braucht das Skript nicht; fehlt ein Bild, nutzt die Seite
assets/og-image.png.

Benötigt lokal Python mit Playwright und Chrome/Chromium:
    pip install playwright && playwright install chromium
(oder ein vorhandenes Chrome per Umgebungsvariable CHROME=/pfad/zu/chrome)
"""
import asyncio
import base64
import html
import json
import mimetypes
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src")
OUT = os.path.join(ROOT, "assets", "og")
COLORS = {"hardware": "#ff9a6b", "crypto": "#cfa9ff", "wireless": "#72cdff",
          "software": "#ff86b0", "network": "#a6e9c9"}
LABELS = {"hardware": "CPU & Hardware", "crypto": "TLS & Crypto", "wireless": "Wireless",
          "software": "Software", "network": "Network"}


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    if path.endswith(".webp"):
        mime = "image/webp"
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def tilt(vid):
    """Gleiche Neigung wie in der Galerie (app.js, FNV-1a)."""
    h = 2166136261
    for ch in vid:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return (h % 700) / 100 - 3.5


def page(v, font):
    esc = html.escape
    name = v["name"]
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Archivo; src: url({font}) format("woff2"); font-weight: 400 900; font-stretch: 100% 125%; }}
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: 1200px; height: 630px; overflow: hidden; }}
body {{
  font-family: Archivo, sans-serif; color: #eef4ef; background-color: #1f3d35;
  background-image:
    linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px);
  background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px;
  background-position: -1px -1px;
  display: grid; grid-template-columns: 520px 1fr; align-items: center;
  padding: 0 64px 0 72px; gap: 56px;
}}
.brand {{ position: absolute; left: 48px; top: 34px; display: flex; align-items: center; gap: 12px;
  font-weight: 750; font-stretch: 112%; font-size: 26px; }}
.brand svg {{ width: 30px; height: 30px; }}
.brand path {{ fill: #fff; stroke: #1b2a12; stroke-width: 1.6; }}
.brand .fold {{ fill: #ffd84d; }}
.sticker {{ width: 440px; height: 380px; display: grid; place-items: center; padding: 34px;
  background: {"#1b1b1b" if v.get("darkBackground") else "#fff"}; border-radius: 28px;
  transform: rotate({tilt(v["id"]):.2f}deg);
  box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 2px 2px rgba(0,0,0,.18), 0 30px 40px -18px rgba(4,18,14,.7); }}
.sticker img {{ width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: contain; }}
h1 {{ font-size: 112px; font-weight: 860; font-stretch: 118%; line-height: .98; letter-spacing: -.02em;
  overflow-wrap: normal; hyphens: none; }}
.text {{ min-width: 0; max-height: 470px; }}
.meta {{ margin-top: 26px; display: flex; gap: 22px; align-items: center; font-size: 28px; color: #a9c4b9; }}
.cat::before {{ content: ""; display: inline-block; width: 18px; height: 18px; border-radius: 50%;
  background: {COLORS[v["category"]]}; margin-right: 10px; }}
.url {{ position: absolute; right: 56px; bottom: 36px; font-size: 24px; font-weight: 600; color: #ffd84d; }}
</style></head><body>
<div class="brand"><svg viewBox="0 0 32 32"><path d="M6 3h15l8 8v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path class="fold" d="M21 3v5a3 3 0 0 0 3 3h5Z"/></svg>Vulnallery</div>
<div class="sticker"><img src="{data_uri(os.path.join(ROOT, "assets", "img", v["image"]))}" alt=""></div>
<div class="text"><h1 id="name">{esc(name)}</h1><p class="meta"><span>{esc(v["date"][:4])}</span><span class="cat">{esc(LABELS[v["category"]])}</span></p></div>
<div class="url">vulnallery.de</div>
</body></html>"""


async def main(args):
    from playwright.async_api import async_playwright
    items = json.load(open(os.path.join(ROOT, "data", "vulns.json"), encoding="utf-8"))
    ids = [a for a in args if not a.startswith("--")]
    if ids:
        items = [v for v in items if v["id"] in ids]
    elif "--all" not in args:
        items = [v for v in items if not os.path.exists(os.path.join(OUT, v["id"] + ".jpg"))]
    if not items:
        print("Alle Vorschaubilder vorhanden.")
        return
    os.makedirs(OUT, exist_ok=True)
    font = data_uri(os.path.join(ROOT, "assets", "fonts", "archivo-latin-wdth.woff2"))
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
        browser = await p.chromium.launch(**kw)
        pg = await browser.new_page(viewport={"width": 1200, "height": 630})
        for v in items:
            await pg.set_content(page(v, font), wait_until="load")
            await pg.evaluate("document.fonts.ready")
            # Schrift verkleinern, bis der Name ohne Worttrennung passt
            await pg.evaluate("""() => {
              const h = document.getElementById('name');
              let s = 112;
              while (s > 40 && (h.scrollWidth > h.clientWidth || h.offsetHeight > 330)) { s -= 4; h.style.fontSize = s + 'px'; }
            }""")
            out = os.path.join(OUT, v["id"] + ".jpg")
            await pg.screenshot(path=out, type="jpeg", quality=82)
            print(f"{v['id']}.jpg  {os.path.getsize(out) // 1024} KB")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
