#!/usr/bin/env sh
BOOTSTRAP="5.3.3"
VENDOR_DIR="src/assets/vendor"

rm -rf "${VENDOR_DIR}"
mkdir "${VENDOR_DIR}"

##############
# Frontend
##############

# Bootstrap
echo "Get Bootstrap"
wget -q "https://github.com/twbs/bootstrap/releases/download/v${BOOTSTRAP}/bootstrap-${BOOTSTRAP}-dist.zip" -O "${VENDOR_DIR}/bootstrap.zip"
unzip -q "${VENDOR_DIR}/bootstrap.zip" -d "${VENDOR_DIR}"
mv -fv "${VENDOR_DIR}/bootstrap-${BOOTSTRAP}-dist" "${VENDOR_DIR}/bootstrap"
find "${VENDOR_DIR}/bootstrap/css" -type f -not -name "bootstrap.min.css" -delete
find "${VENDOR_DIR}/bootstrap/js" -type f -not -name "bootstrap.bundle.min.js" -delete

# Clean up
rm -rf "${VENDOR_DIR}"/*.zip

# Generate File Hashes
FILES="$(find "${VENDOR_DIR}" -type f)"
for file in ${FILES}; do
	hash="$(openssl dgst -sha384 -binary "${file}" | openssl base64 -A)"
	echo "sha384-${hash} ${file}"
done
