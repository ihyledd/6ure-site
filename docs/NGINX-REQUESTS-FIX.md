# Nginx: /requests shows homepage instead of Requests page

If `https://6ureleaks.com/requests/` shows the **home page** instead of the Requests page, Nginx is stripping the path when proxying.

**Cause:** `proxy_pass http://localhost:4000/;` (with a trailing slash) makes Nginx replace the location prefix with `/`, so the app receives `GET /` and serves the homepage.

**Deploy script:** When you run `deploy-to-vps.ps1` from the repo root, it uploads `6ureleaks.conf` from the repo to the VPS, copies it to `/etc/nginx/sites-available/6ureleaks.conf`, and runs `nginx -t` and `systemctl reload nginx`. That keeps the server config in sync and ensures `proxy_pass` has **no trailing slash** so the full path is passed to Next.js.

**Manual fix on the VPS (if needed):** In `/etc/nginx/sites-enabled/6ureleaks.conf` (or `sites-available`), ensure the `/requests` blocks use **no trailing slash** after the port:

```nginx
location /requests/api/ {
    proxy_pass http://localhost:4000;   # no slash after 4000
    ...
}
location /requests/ {
    proxy_pass http://localhost:4000;   # no slash after 4000
    ...
}
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

If you previously ran `sed` to change 6969 to 4000, the old config had `proxy_pass http://localhost:6969/;`, which became `proxy_pass http://localhost:4000/;` — remove that trailing slash so the full path is passed to Next.js.
