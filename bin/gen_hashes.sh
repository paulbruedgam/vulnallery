#!/usr/bin/env bash
CSS_FILES="$(find . -name '*.css')"
JS_FILES="$(find . -name '*.js')"

#Generate File Hashes
# shellcheck disable=SC2086
for file in ${CSS_FILES} ${JS_FILES}; do
	hash=$(openssl dgst -sha384 -binary $file | openssl base64 -A)
	echo "sha384-$hash $file"
done
