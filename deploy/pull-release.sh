#!/usr/bin/env bash
# Holt ein Release von Vulnallery von GitHub, prüft es und schaltet es live.
#
#   pull-release.sh                 neueste Version einspielen
#   pull-release.sh v2026.11.3      bestimmte Version einspielen
#   pull-release.sh --rollback      zur vorherigen Version zurück
#   pull-release.sh --list          installierte Versionen anzeigen
#   pull-release.sh --check         nur prüfen, ob eine neuere Version vorliegt
#
# Verzeichnisaufbau unter BASE_DIR (Webroot des Webservers = BASE_DIR/current):
#   releases/vulnallery-<version>/   entpackte Versionen
#   current -> releases/...          aktive Version (Symlink)
#   previous                         Name der zuletzt aktiven Version
#
# Einstellungen per Umgebung (oder in /etc/default/vulnallery):
#   VULNALLERY_REPO      GitHub-Repository           (paulbruedgam/vulnallery)
#   VULNALLERY_BASE_DIR  Zielverzeichnis             (/var/www/vulnallery)
#   VULNALLERY_KEEP      Anzahl behaltener Versionen (5)
#   GITHUB_TOKEN         nur nötig, falls das Repository privat wird (Leserecht "Contents")
#
# Benötigt: bash, curl, tar, sha256sum, flock. Läuft ohne root, wenn der
# Benutzer BASE_DIR besitzt; der Webserver braucht nur Leserechte.
set -euo pipefail
umask 022

[ -r /etc/default/vulnallery ] && . /etc/default/vulnallery

REPO="${VULNALLERY_REPO:-paulbruedgam/vulnallery}"
BASE_DIR="${VULNALLERY_BASE_DIR:-/var/www/vulnallery}"
KEEP="${VULNALLERY_KEEP:-5}"
API="${VULNALLERY_API:-https://api.github.com}"
DL="${VULNALLERY_DL:-https://github.com}"

RELEASES="$BASE_DIR/releases"
CURRENT="$BASE_DIR/current"
PREVIOUS_FILE="$BASE_DIR/previous"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
die() { log "FEHLER: $*" >&2; exit 1; }

for cmd in curl tar sha256sum flock; do
  command -v "$cmd" >/dev/null || die "$cmd fehlt"
done

CURL=(curl -fsSL --proto '=https' --tlsv1.2 --retry 3 --connect-timeout 10 --max-time 300)
API_HEADERS=(-H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
if [ -n "${GITHUB_TOKEN:-}" ]; then
  API_HEADERS+=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

mkdir -p "$RELEASES"
exec 9>"$BASE_DIR/.lock"
flock -n 9 || die "läuft bereits"

current_version() {
  [ -L "$CURRENT" ] || return 0
  basename "$(readlink "$CURRENT")" | sed 's/^vulnallery-//'
}

latest_version() {
  local json tag
  json=$("${CURL[@]}" "${API_HEADERS[@]}" "$API/repos/$REPO/releases/latest") \
    || die "neueste Version konnte nicht abgefragt werden"
  tag=$(printf '%s' "$json" | tr -d '\n' | grep -o '"tag_name": *"[^"]*"' | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')
  [ -n "$tag" ] || die "keine Version in der Antwort gefunden"
  printf '%s' "$tag"
}

valid_version() { [[ "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; }

# Datei eines Releases laden. Öffentlich direkt, privat über die Asset-API.
fetch_asset() {
  local version="$1" name="$2" out="$3"
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    "${CURL[@]}" -o "$out" "$DL/$REPO/releases/download/$version/$name"
    return
  fi
  local json id
  json=$("${CURL[@]}" "${API_HEADERS[@]}" "$API/repos/$REPO/releases/tags/$version") || return 1
  id=$(printf '%s' "$json" | tr -d '\n' | grep -o "\"url\": *\"[^\"]*/assets/[0-9]*\"[^}]*\"name\": *\"$name\"" \
       | grep -o '/assets/[0-9]*' | head -n1 | tr -dc '0-9')
  [ -n "$id" ] || return 1
  "${CURL[@]}" -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/octet-stream" \
    -o "$out" "$API/repos/$REPO/releases/assets/$id"
}

switch_to() {
  local dir="$1" old
  old=$(current_version)
  ln -sfn "releases/$(basename "$dir")" "$BASE_DIR/.current.new"
  mv -Tf "$BASE_DIR/.current.new" "$CURRENT"    # atomarer Wechsel
  [ -n "$old" ] && [ "vulnallery-$old" != "$(basename "$dir")" ] && printf '%s\n' "$old" > "$PREVIOUS_FILE"
  log "aktiv: $(current_version)"
}

cleanup_old() {
  local keep_cur keep_prev
  keep_cur="vulnallery-$(current_version)"
  keep_prev="vulnallery-$(cat "$PREVIOUS_FILE" 2>/dev/null || true)"
  find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -name 'vulnallery-v*' -printf '%f\n' \
    | sort -V | head -n "-$KEEP" | while read -r d; do
        [ "$d" = "$keep_cur" ] || [ "$d" = "$keep_prev" ] && continue
        log "entferne alte Version $d"
        rm -rf -- "${RELEASES:?}/$d"
      done
}

TMP_DL=""
cleanup_tmp() { [ -n "$TMP_DL" ] && rm -rf -- "$TMP_DL"; TMP_DL=""; }
trap cleanup_tmp EXIT

install_version() {
  local version="$1" target="$RELEASES/vulnallery-$1" tmp
  valid_version "$version" || die "ungültige Version: $version"

  if [ -d "$target" ]; then
    log "$version ist bereits entpackt"
  else
    tmp=$(mktemp -d "$BASE_DIR/.download.XXXXXX")
    TMP_DL="$tmp"

    log "lade $version"
    fetch_asset "$version" "vulnallery-$version.tar.gz" "$tmp/vulnallery-$version.tar.gz" \
      || die "Paket für $version konnte nicht geladen werden (gibt es das Release?)"
    fetch_asset "$version" "SHA256SUMS" "$tmp/SHA256SUMS" \
      || die "SHA256SUMS für $version konnte nicht geladen werden"

    log "prüfe Prüfsumme"
    grep -q " vulnallery-$version.tar.gz\$" "$tmp/SHA256SUMS" || die "Paket fehlt in SHA256SUMS"
    (cd "$tmp" && grep " vulnallery-$version.tar.gz\$" SHA256SUMS | sha256sum -c --quiet -) \
      || die "Prüfsumme stimmt nicht"

    log "prüfe Archivinhalt"
    tar -tzf "$tmp/vulnallery-$version.tar.gz" | while read -r entry; do
      case "$entry" in
        "vulnallery-$version/"*) ;;
        *) die "unerwarteter Pfad im Archiv: $entry" ;;
      esac
      case "$entry" in *..*) die "unsicherer Pfad im Archiv: $entry" ;; esac
    done

    tar -xzf "$tmp/vulnallery-$version.tar.gz" -C "$tmp" --no-same-owner --no-same-permissions
    [ -f "$tmp/vulnallery-$version/index.html" ] || die "index.html fehlt im Paket"
    find "$tmp/vulnallery-$version" -type l -print -quit | grep -q . && die "Symlinks im Paket sind nicht erlaubt"

    mv "$tmp/vulnallery-$version" "$target"
    cleanup_tmp
  fi

  if [ "$(current_version)" = "$version" ]; then
    log "$version ist bereits aktiv"
  else
    switch_to "$target"
  fi
  cleanup_old
}

case "${1:-latest}" in
  --list)
    cur=$(current_version)
    find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -name 'vulnallery-v*' -printf '%f\n' | sort -V \
      | sed 's/^vulnallery-//' | while read -r v; do
          [ "$v" = "$cur" ] && echo "* $v (aktiv)" || echo "  $v"
        done
    ;;
  --check)
    latest=$(latest_version) || exit 1
    cur=$(current_version)
    if [ "$latest" = "$cur" ]; then log "aktuell: $cur"; else log "neu verfügbar: $latest (aktiv: ${cur:-keine})"; exit 10; fi
    ;;
  --rollback)
    prev=$(cat "$PREVIOUS_FILE" 2>/dev/null || true)
    [ -n "$prev" ] && [ -d "$RELEASES/vulnallery-$prev" ] || die "keine vorherige Version vorhanden"
    switch_to "$RELEASES/vulnallery-$prev"
    ;;
  -h|--help)
    sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  latest)
    latest=$(latest_version) || exit 1
    install_version "$latest"
    ;;
  v*)
    install_version "$1"
    ;;
  *)
    die "unbekannter Parameter: $1 (Hilfe: --help)"
    ;;
esac
