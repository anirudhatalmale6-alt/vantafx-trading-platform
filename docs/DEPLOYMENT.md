# Deployment

Two supported shapes: a plain Linux VPS (recommended, because the background
stop-loss ticker and the chat stream want a long-lived process), or a container.

---

## 1. Requirements

- Node.js 20 or newer
- ~500 MB disk, 1 GB RAM is comfortable
- A domain with an A record pointing at the server
- Nothing else. No database server, no Redis, no third-party account.

---

## 2. VPS install

```bash
sudo adduser --system --group vantafx
sudo mkdir -p /srv/vantafx && sudo chown vantafx:vantafx /srv/vantafx

sudo -u vantafx -H bash
cd /srv/vantafx
git clone <your-repo-url> .
npm ci
```

### Environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Set it to |
| --- | --- |
| `DATABASE_URL` | `file:/srv/vantafx/data/production.db` |
| `SESSION_SECRET` | output of `openssl rand -base64 48` — **required**, and never reuse it |
| `PRICE_SOURCE` | `simulated` or `ecb` |
| `NEWS_FEEDS` | comma-separated RSS URLs, or empty to hide the news strip |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | the first admin account |

```bash
mkdir -p /srv/vantafx/data
npm run setup      # creates tables and the admin account
npm run build
```

### systemd unit

`/etc/systemd/system/vantafx.service`:

```ini
[Unit]
Description=VantaFX trading platform
After=network.target

[Service]
Type=simple
User=vantafx
Group=vantafx
WorkingDirectory=/srv/vantafx
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/srv/vantafx/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vantafx
sudo journalctl -u vantafx -f
```

---

## 3. nginx and TLS

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # The quote feed and the chat are server-sent event streams. Without
        # these three lines nginx buffers them and both appear frozen.
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
```

```bash
sudo certbot --nginx -d yourdomain.com
```

**`X-Forwarded-For` matters.** Rate limiting reads it. Without it every visitor
looks like the same IP and one person hitting the login form locks out everybody.

**Serve over HTTPS.** Session cookies are marked `Secure` in production, so over
plain `http://` the browser will not send them back and sign-in silently fails.
If you deliberately need a demo on plain http, set `SECURE_COOKIES=false` — and
unset it the moment a certificate is in place.

---

## 4. Docker

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm start"]
```

Mount a volume for the SQLite file so it survives a redeploy:

```bash
docker run -d --name vantafx -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  -e DATABASE_URL="file:/data/production.db" \
  -v vantafx-data:/data vantafx
```

---

## 5. Backups

Everything lives in one SQLite file.

```bash
# /etc/cron.daily/vantafx-backup
sqlite3 /srv/vantafx/data/production.db ".backup '/var/backups/vantafx-$(date +%F).db'"
find /var/backups -name 'vantafx-*.db' -mtime +30 -delete
```

Use `.backup`, not `cp` — copying a live SQLite file can capture a torn write.

---

## 6. Moving to PostgreSQL

1. `prisma/schema.prisma` → `provider = "postgresql"`
2. `DATABASE_URL="postgresql://user:pass@host:5432/vantafx"`
3. `npx prisma migrate deploy`

No application code changes.

At that point also swap the two in-memory maps for something shared, or pin the
app to a single instance:

- `src/lib/rate-limit.ts` — counters are per process
- `src/lib/chat-bus.ts` — chat delivery is per process

Both are small and marked with a comment saying exactly what to replace.

---

## 7. Upgrading

```bash
cd /srv/vantafx
git pull
npm ci
npx prisma db push
npm run build
sudo systemctl restart vantafx
```
