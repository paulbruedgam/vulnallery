# Vulnallery

**The gallery of vulnerabilities – there is no critical vulnerability without a logo in this world.**
**Die Galerie der Sicherheitslücken – keine kritische Lücke ohne Logo.**

Live: <https://vulnallery.de/>

## Aufbau / Structure

```
src/
├── index.html              Seite (statisch, CSP per <meta>)
├── data/vulns.json         alle Einträge
├── assets/
│   ├── css/style.css       Layout und Design (keine Frameworks)
│   ├── js/app.js           Galerie, Filter, Zeitleiste, Detailansicht, DE/EN
│   ├── fonts/              Archivo (OFL), selbst gehostet
│   ├── img/                Logos
│   ├── favicon.svg
│   └── og-image.png        Vorschaubild für Social Media
bin/gen_hashes.sh           trägt die SRI-Hashes von CSS/JS in index.html ein
```

Reines HTML, CSS und JavaScript ohne Abhängigkeiten, Build-Schritt, Cookies, Tracker oder externe Requests.

## Eine Lücke hinzufügen / Adding a vulnerability

1. Logo nach `src/assets/img/` legen (SVG bevorzugt, sonst PNG/WebP, max. ca. 100 KB). Aufgenommen werden nur Lücken mit offiziellem Logo.
2. Eintrag in `src/data/vulns.json` ergänzen:

```json
{
  "id": "heartbleed",
  "name": "Heartbleed",
  "date": "2014-04-07",
  "image": "heartbleed.png",
  "url": "https://heartbleed.com/",
  "category": "crypto",
  "cve": ["CVE-2014-0160"],
  "description": {
    "de": "Ein Satz auf Deutsch.",
    "en": "One sentence in English."
  }
}
```

| Feld | Pflicht | Regeln |
|---|---|---|
| `id` | ja | eindeutig, `a-z`, `0-9`, `-`; wird als Deep-Link genutzt (`/#heartbleed`) |
| `date` | ja | `YYYY`, `YYYY-MM` oder `YYYY-MM-DD` – nur so genau, wie es belegt ist |
| `image` | ja | Dateiname in `assets/img/` (png, jpg, svg, webp, gif) |
| `url` | ja | Originalquelle, `https://` (oder `http://`) |
| `category` | ja | `hardware`, `crypto`, `wireless`, `software`, `network` |
| `cve` | nein | Liste von CVE-IDs, werden mit der NVD verlinkt |
| `description` | ja | `de` und `en`, je ein Satz |
| `added` | nein | z. B. `"2026-10"` – zeigt das Etikett „Neu“ |
| `darkBackground` | nein | `true` für Logos, die für dunklen Hintergrund gemacht sind |

Einträge, die die Regeln verletzen, blendet `app.js` aus.

3. Nur wenn CSS oder JS geändert wurden: `./bin/gen_hashes.sh` ausführen.

## Sicherheit / Security

- Content-Security-Policy per `<meta>`: nur Ressourcen der eigenen Origin, kein Inline-Script/-Style, `base-uri 'none'`, `form-action 'none'`.
- Subresource Integrity für `style.css` und `app.js`.
- Daten aus `vulns.json` werden validiert und nur per `textContent`/geprüften Attributen eingefügt, nie als HTML.
- Externe Links mit `rel="noopener noreferrer"`.
- GitHub Pages erlaubt keine eigenen HTTP-Header. `frame-ancestors`, `X-Content-Type-Options` u. Ä. lassen sich nur über einen vorgeschalteten Proxy/CDN setzen.

## Lizenz

Code: siehe [LICENSE](LICENSE). Schrift Archivo: SIL Open Font License (`src/assets/fonts/OFL-Archivo.txt`).
Die Logos gehören ihren jeweiligen Urheberinnen und Urhebern. Bei Problemen mit Bildrechten bitte ein [Issue](https://github.com/paulbruedgam/vulnallery.github.io/issues/new/choose) anlegen.
