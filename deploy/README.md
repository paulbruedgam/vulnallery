# Deployment auf dem eigenen Server

GitHub baut und prüft nur. Ausgeliefert wird von deinem Server.

## So entsteht ein Release

Jeder Merge nach `main` erzeugt automatisch einen Tag `vJJJJ.MM.N` (z. B. `v2026.11.1`,
`v2026.11.2`, im Dezember wieder ab `v2026.12.1`) und ein GitHub-Release mit:

- `vulnallery-<version>.tar.gz` – der Webroot
- `vulnallery-<version>.zip` – dasselbe als ZIP
- `SHA256SUMS` – Prüfsummen

Pull Requests erzeugen nur ein Artefakt zum Testen (*Actions → Build → Artifacts*, 14 Tage).

## Einspielen mit `pull-release.sh`

Einmalig einrichten (als root):

```sh
useradd --system --home /var/www/vulnallery --shell /usr/sbin/nologin vulnallery
install -d -o vulnallery -g vulnallery -m 755 /var/www/vulnallery
install -o root -g root -m 755 pull-release.sh /usr/local/bin/vulnallery-pull
```

Danach als Benutzer `vulnallery`:

```sh
sudo -u vulnallery vulnallery-pull              # neueste Version einspielen
sudo -u vulnallery vulnallery-pull v2026.11.3   # bestimmte Version
sudo -u vulnallery vulnallery-pull --rollback   # zur vorherigen Version zurück
sudo -u vulnallery vulnallery-pull --list       # installierte Versionen
sudo -u vulnallery vulnallery-pull --check      # Exit-Code 10, wenn es eine neuere gibt
```

Das Skript:

1. fragt die neueste Version über die GitHub-API ab,
2. lädt Paket und `SHA256SUMS` nur per HTTPS,
3. bricht ab, wenn die Prüfsumme nicht stimmt, das Archiv Pfade außerhalb seines Ordners oder Symlinks enthält oder `index.html` fehlt,
4. entpackt nach `releases/vulnallery-<version>/` und schaltet den Symlink `current` atomar um,
5. behält die letzten 5 Versionen (plus die vorherige) und löscht ältere.

Der Webserver zeigt auf `/var/www/vulnallery/current` und braucht nur Leserechte.
Ein Neustart des Webservers ist nicht nötig.

Einstellungen in `/etc/default/vulnallery` (alle optional):

```sh
VULNALLERY_REPO=paulbruedgam/vulnallery
VULNALLERY_BASE_DIR=/var/www/vulnallery
VULNALLERY_KEEP=5
# Nur falls das Repository privat wird: Fine-grained Token, nur "Contents: Read"
#GITHUB_TOKEN=github_pat_...
```

Benötigt werden `bash`, `curl`, `tar`, `sha256sum` und `flock`, auf Debian/Ubuntu alle vorinstalliert.

## Automatisch aktualisieren (optional)

`vulnallery-pull.service` und `vulnallery-pull.timer` prüfen stündlich auf ein neues Release:

```sh
install -m 644 vulnallery-pull.service vulnallery-pull.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now vulnallery-pull.timer
journalctl -u vulnallery-pull.service     # Protokoll
```

Ohne Timer spielst du Versionen bewusst von Hand ein.

## Webserver

- **nginx:** `nginx-security-headers.conf` nach `/etc/nginx/snippets/vulnallery-security-headers.conf` kopieren, `nginx.conf` als Server-Block übernehmen, Zertifikatspfade anpassen, `nginx -t && systemctl reload nginx`. `http2 on;` braucht nginx ab 1.25.1, sonst `listen 443 ssl http2;`.
- **Apache:** `apache.htaccess` als `.htaccess` in den Webroot oder in den VirtualHost (`mod_headers`, `mod_rewrite`, `mod_deflate`).

Beide setzen CSP (inkl. `frame-ancestors`), HSTS, `nosniff`, Referrer-, Permissions- und
Cross-Origin-Policy und liefern Fremd-SVGs nur in einer Sandbox aus.

## Prüfen

- https://securityheaders.com/?q=vulnallery.de
- https://developer.mozilla.org/en-US/observatory/analyze?host=vulnallery.de
- HSTS-Preload erst eintragen (`; preload` und hstspreload.org), wenn alle Subdomains dauerhaft HTTPS können.
