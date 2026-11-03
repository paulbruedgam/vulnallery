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
bin/validate.py             prüft vulns.json, Bilder und Bildrechte
bin/build.sh                prüft und baut das Paket für den Webserver (dist/)
deploy/                     nginx- und Apache-Konfiguration, Anleitung
.github/workflows/build.yml Build bei Pull Request; bei Merge nach main Tag und Release
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
| `credit` | ja | Bildrechte des Logos, siehe unten |

Einträge, die die Regeln verletzen, blendet `app.js` aus.

### Bildrechte (`credit`)

```json
"credit": {
  "license": "CC0",
  "author": "Natascha Eibl",
  "holder": "TU Graz",
  "source": "https://meltdownattack.com/",
  "commons": false
}
```

| Feld | Bedeutung |
|---|---|
| `license` | `CC0`, `CC-BY-4.0`, `CC-BY-2.5`, `CC-BY-SA-4.0`, `PD` (gemeinfrei), `free` (Nutzung laut Quelle erlaubt, ohne Lizenz) oder `none` (keine Lizenz angegeben) |
| `author` | Gestaltung, falls genannt |
| `holder` | Rechteinhaber, falls bekannt |
| `note` | optional: `chromium`, `safari` oder `ai` für Zusatzhinweise |
| `source` | Fundstelle der Angabe |
| `commons` | `true`, wenn die Angabe von Wikimedia Commons statt von der offiziellen Seite stammt |

Die Angaben werden in der Detailansicht unter „Bildrechte“ angezeigt.

3. Nur wenn CSS oder JS geändert wurden: `./bin/gen_hashes.sh` ausführen.

## Bauen und ausliefern / Build and deploy

GitHub baut und prüft nur, ausgeliefert wird vom eigenen Server.

```sh
./bin/build.sh            # lokal: prüft Daten und SRI-Hashes, baut dist/vulnallery-<version>.tar.gz und .zip
```

Jeder Merge nach `main` erzeugt automatisch einen Tag `vJJJJ.MM.N` und ein Release mit Paket und `SHA256SUMS`.
Auf dem Server holt `deploy/pull-release.sh` die neueste Version, prüft sie und schaltet sie live.
Einrichtung, Webserver-Konfiguration und Rückrollen: [deploy/README.md](deploy/README.md).

## Sicherheit / Security

- Content-Security-Policy per `<meta>`: nur Ressourcen der eigenen Origin, kein Inline-Script/-Style, `base-uri 'none'`, `form-action 'none'`.
- Subresource Integrity für `style.css` und `app.js`.
- Daten aus `vulns.json` werden validiert und nur per `textContent`/geprüften Attributen eingefügt, nie als HTML.
- Externe Links mit `rel="noopener noreferrer"`.
- Auf dem eigenen Server setzen `deploy/nginx.conf` bzw. `deploy/apache.htaccess` zusätzlich CSP mit `frame-ancestors`, HSTS, `nosniff`, Referrer-, Permissions- und Cross-Origin-Policy; Fremd-SVGs laufen in einer Sandbox.
- `bin/validate.py` weist SVGs mit Script- oder Event-Inhalten ab.

## Lizenz

Code: siehe [LICENSE](LICENSE). Schrift Archivo: SIL Open Font License (`src/assets/fonts/OFL-Archivo.txt`).
Die Logos gehören ihren jeweiligen Urheberinnen und Urhebern. Bei Problemen mit Bildrechten bitte ein [Issue](https://github.com/paulbruedgam/vulnallery.github.io/issues/new/choose) anlegen.
