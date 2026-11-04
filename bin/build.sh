#!/usr/bin/env bash
# Baut das Auslieferungspaket für den eigenen Webserver.
#
#   ./bin/build.sh [VERSION]
#
# Ergebnis in dist/:
#   vulnallery-<VERSION>.tar.gz   Inhalt von src/ (Webroot)
#   vulnallery-<VERSION>.zip      dasselbe als ZIP
#   SHA256SUMS                    Prüfsummen beider Pakete
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:-$(git describe --tags --always --dirty 2>/dev/null || date +%Y%m%d%H%M)}"
NAME="vulnallery-${VERSION}"

echo "== Daten prüfen"
python3 bin/validate.py

echo "== SRI-Hashes prüfen"
cp src/index.html /tmp/vulnallery-index.before
./bin/gen_hashes.sh >/dev/null
if ! cmp -s /tmp/vulnallery-index.before src/index.html; then
  if [ "${CI:-}" = "true" ]; then
    echo "SRI-Hashes in src/index.html sind veraltet. Lokal ./bin/gen_hashes.sh ausführen und committen."
    exit 1
  fi
  echo "SRI-Hashes wurden aktualisiert (lokaler Build)."
fi
rm -f /tmp/vulnallery-index.before

echo "== Paket ${NAME} bauen"
rm -rf dist && mkdir -p "dist/${NAME}"
cp -R src/. "dist/${NAME}/"
# Release-Nummer in den Footer schreiben (nur im Paket, src/ bleibt bei "dev")
case "${VERSION}" in
  *[!A-Za-z0-9._-]*) echo "Ungültige Version: ${VERSION}"; exit 1 ;;
esac
sed -i "s#<span id=\"release\" translate=\"no\">dev</span>#<span id=\"release\" translate=\"no\">${VERSION}</span>#" "dist/${NAME}/index.html"
grep -q "<span id=\"release\" translate=\"no\">${VERSION}</span>" "dist/${NAME}/index.html" \
  || { echo "Release-Nummer konnte nicht in den Footer geschrieben werden."; exit 1; }

echo "== Lückenseiten, Feeds und Sitemap erzeugen"
STAMP="$(git log -1 --format=%ct 2>/dev/null || date +%s)"
python3 bin/pages.py "dist/${NAME}" "${VERSION}" "${STAMP}"
# Reproduzierbare Zeitstempel und Rechte
find "dist/${NAME}" -type d -exec chmod 755 {} +
find "dist/${NAME}" -type f -exec chmod 644 {} +
find "dist/${NAME}" -exec touch -d "@${STAMP}" {} +

tar -C dist --owner=0 --group=0 --numeric-owner --sort=name -czf "dist/${NAME}.tar.gz" "${NAME}"
(cd dist && python3 - "${NAME}" <<'PY'
import os, sys, time, zipfile
name = sys.argv[1]
with zipfile.ZipFile(f"{name}.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, dirs, files in os.walk(name):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(root, f)
            info = zipfile.ZipInfo(p, date_time=time.gmtime(os.path.getmtime(p))[:6])
            info.create_system = 0
            info.external_attr = 0x20
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(p, "rb") as fh:
                z.writestr(info, fh.read())
PY
)
rm -rf "dist/${NAME}"
(cd dist && sha256sum "${NAME}.tar.gz" "${NAME}.zip" > SHA256SUMS)

echo "== Fertig"
ls -l dist
