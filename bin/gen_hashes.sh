#!/usr/bin/env bash
# Berechnet die Subresource-Integrity-Hashes (SHA-384) für style.css, app.js und page.js
# und trägt sie in src/index.html und src/404.html ein. Nach jeder Änderung an
# CSS/JS ausführen.
#
# Zusätzlich hängt das Skript ?v=<Kurz-Hash> an die URLs an. Sonst lieferte
# der Browser-Cache (eine Woche) nach einem Release die alte Datei, die zum
# neuen SRI-Hash nicht passt – und CSS oder JS würden blockiert.
set -euo pipefail
cd "$(dirname "$0")/../src"

sri() { echo "sha384-$(openssl dgst -sha384 -binary "$1" | openssl base64 -A)"; }
short() { openssl dgst -sha256 "$1" | awk '{print substr($NF,1,10)}'; }

CSS_HASH="$(sri assets/css/style.css)"
JS_HASH="$(sri assets/js/app.js)"
CSS_V="$(short assets/css/style.css)"
JS_V="$(short assets/js/app.js)"
PAGE_HASH="$(sri assets/js/page.js)"
PAGE_V="$(short assets/js/page.js)"

for page in index.html 404.html; do
  [ -f "$page" ] || continue
  sed -i -E \
    -e "s#(href=\"/?assets/css/style\.css)(\?v=[0-9a-f]*)?(\" integrity=\")[^\"]*#\1?v=${CSS_V}\3${CSS_HASH}#" \
    -e "s#(src=\"/?assets/js/app\.js)(\?v=[0-9a-f]*)?(\" integrity=\")[^\"]*#\1?v=${JS_V}\3${JS_HASH}#" \
    -e "s#(src=\"/?assets/js/page\.js)(\?v=[0-9a-f]*)?(\" integrity=\")[^\"]*#\1?v=${PAGE_V}\3${PAGE_HASH}#" \
    "$page"
done

echo "style.css  ${CSS_HASH}"
echo "app.js     ${JS_HASH}"
echo "page.js    ${PAGE_HASH}"
