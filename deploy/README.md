# Deployment auf dem eigenen Server

GitHub baut und prüft nur. Ausgeliefert wird von deinem Server.

## 1. Paket holen

- **Release (empfohlen):** Tag setzen, z. B. `git tag v2026.11.0 && git push origin v2026.11.0`.
  Der Workflow legt ein Release mit `vulnallery-<version>.tar.gz`, `.zip` und `SHA256SUMS` an.
- **Zwischenstand:** Jeder Push auf `main` und jeder Pull Request erzeugt ein Artefakt
  unter *Actions → Build → Artifacts* (14 Tage gültig).
- **Lokal:** `./bin/build.sh` legt dasselbe Paket in `dist/` ab.

## 2. Auf dem Server einspielen

```sh
VERSION=v2026.11.0
cd /var/www/vulnallery
curl -fsSLO https://github.com/paulbruedgam/vulnallery/releases/download/$VERSION/vulnallery-$VERSION.tar.gz
curl -fsSLO https://github.com/paulbruedgam/vulnallery/releases/download/$VERSION/SHA256SUMS
sha256sum --ignore-missing -c SHA256SUMS
mkdir -p releases && tar -xzf vulnallery-$VERSION.tar.gz -C releases
ln -sfn releases/vulnallery-$VERSION current      # Umschalten ohne Ausfallzeit
```

Zurückrollen: `ln -sfn releases/vulnallery-<alte Version> current`.

Bei einem privaten Repository brauchen die `curl`-Aufrufe ein Token
(`gh release download $VERSION -R paulbruedgam/vulnallery` ist dann einfacher).

## 3. Webserver

- **nginx:** `deploy/nginx-security-headers.conf` nach `/etc/nginx/snippets/vulnallery-security-headers.conf` kopieren, `deploy/nginx.conf` als Server-Block übernehmen, Zertifikatspfade anpassen, `nginx -t && systemctl reload nginx`.
- **Apache:** `deploy/apache.htaccess` als `.htaccess` in den Webroot oder in den VirtualHost.

Beide setzen CSP (inkl. `frame-ancestors`), HSTS, `nosniff`, Referrer-, Permissions- und
Cross-Origin-Policy und liefern Fremd-SVGs nur in einer Sandbox aus.

## 4. Prüfen

- https://securityheaders.com/?q=vulnallery.de
- https://developer.mozilla.org/en-US/observatory/analyze?host=vulnallery.de
- HSTS-Preload erst eintragen (`; preload` und hstspreload.org), wenn alle Subdomains dauerhaft HTTPS können.
