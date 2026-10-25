#!/usr/bin/env bash
# Berechnet die Subresource-Integrity-Hashes (SHA-384) für style.css und app.js
# und trägt sie in src/index.html ein. Nach jeder Änderung an CSS/JS ausführen.
set -euo pipefail
cd "$(dirname "$0")/../src"

sri() { echo "sha384-$(openssl dgst -sha384 -binary "$1" | openssl base64 -A)"; }

CSS_HASH="$(sri assets/css/style.css)"
JS_HASH="$(sri assets/js/app.js)"

sed -i -E \
  -e "s#(href=\"assets/css/style.css\" integrity=\")[^\"]*#\1${CSS_HASH}#" \
  -e "s#(src=\"assets/js/app.js\" integrity=\")[^\"]*#\1${JS_HASH}#" \
  index.html

echo "style.css  ${CSS_HASH}"
echo "app.js     ${JS_HASH}"
