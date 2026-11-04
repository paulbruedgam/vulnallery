# Vulnallery – Regeln für die Arbeit am Repository

Galerie von Sicherheitslücken mit eigenem Logo. Reines HTML, CSS und JavaScript, keine Abhängigkeiten.
GitHub baut nur; ausgeliefert wird vom eigenen Server des Betreibers (siehe deploy/README.md).

## Inhalt
- Aufgenommen werden nur Lücken mit offiziellem Logo. Ohne Logo kein Eintrag, auch kein Platzhalter.
- Jeder Eintrag in `src/data/vulns.json` braucht `description.de` und `description.en` (je ein Satz) und `credit` (Bildrechte, Schema in der README).
- Lizenz und Gestaltung nur angeben, wenn eine Quelle sie nennt; Angaben von Wikimedia Commons mit `"commons": true` kennzeichnen.
- Daten nur so genau angeben, wie sie belegt sind (`YYYY`, `YYYY-MM` oder `YYYY-MM-DD`).
- Neue Einträge 1–2 Monate lang mit `"added": "<YYYY-MM>"` markieren.

## Logos
- SVG bevorzugt, sonst WebP/PNG auf ca. 600 px Breite, Ziel unter 100 KB pro Datei.
- SVGs vor dem Einchecken auf Scripts und Event-Attribute prüfen; `bin/validate.py` weist sie ab.
- Logos für dunklen Hintergrund mit `"darkBackground": true` markieren.
- Für jeden neuen Eintrag `./bin/gen_og.py` ausführen (Vorschaubild `src/assets/og/<id>.jpg`, braucht Playwright und Chrome) und das Bild einchecken.

## Code
- Keine externen Ressourcen (CDN, Fonts, Analytics), keine Cookies, keine Tracker.
- Kein Inline-Script und kein Inline-Style: die CSP in `src/index.html` erlaubt nur `'self'`.
- Daten nie per `innerHTML` einfügen, nur `textContent` und geprüfte Attribute.
- Alle Texte zweisprachig in `src/assets/js/app.js` (Objekt `T`, `de` und `en`).
- Nach jeder Änderung an CSS oder JS `./bin/gen_hashes.sh` ausführen; der CI-Build schlägt sonst fehl.
- Vor dem Commit `./bin/build.sh` laufen lassen. Er erzeugt mit `bin/pages.py` die Lückenseiten `/de/<id>/` und `/en/<id>/`, `sitemap.xml` und die Atom-Feeds; diese entstehen nur in `dist/`, nie in `src/`.
- `bin/pages.py` liest die Texte aus `T` in `app.js`; Einträge dort im Format `schluessel: "Text",` halten.

## Ablauf
- Arbeit auf einem Branch, Änderungen per Pull Request nach `main`; der Betreiber merged selbst.
- Commit-Nachrichten auf Deutsch.
