---
name: postgrest-self-host
description: "Replace Supabase cloud with self-hosted PostgreSQL + PostgREST via Docker. Setup, data migration, nginx proxy, and app reconfiguration."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [PostgreSQL, PostgREST, Supabase, Docker, Nginx, Migration, Self-Hosted]
    related_skills: [database-provisioning, kamal-deployment]
---

# PostgREST Self-Hosting (Supabase Alternative)

Replace Supabase cloud with a lightweight self-hosted stack: **PostgreSQL + PostgREST** behind nginx. The app's supabase-js client continues to work unchanged because PostgREST exposes a compatible REST API.

---

## When to Use

- Supabase free tier hit statement timeouts (`error 57014`)
- Want data on your own VPS (latency ~0ms vs ~2s to supabase.co)
- App uses basic CRUD only (select, insert, update, delete) — no Supabase Auth or Realtime
- Data is small (<1000 rows) — full Supabase self-host is overkill (8+ containers, 2-4 GB RAM)

## Architecture

```
Browser → nginx:443 → /rest/v1/* → PostgREST:3334 → PostgreSQL
                    → /*          → App container
```

---

## Step 1: Docker Compose Setup

Create `infra/docker-compose.yml` (see `templates/docker-compose-postgrest.yml`):

Key points:
- PostgreSQL 15 Alpine + PostgREST latest
- PostgREST binds to `127.0.0.1:3334` only (never expose publicly)
- `PGRST_DB_ANON_ROLE: anon` — anonymous requests use this role
- `PGRST_JWT_SECRET` — any string works; we strip JWT in nginx anyway

## Step 2: Database Init SQL

Create `infra/init.sql` — this runs on first container start:
- Create `authenticator` (login) and `anon` roles
- `GRANT anon TO authenticator`
- Create tables with same schema as Supabase
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon`
- Add indexes for performance

See the schema in `references/supabase-migration.md`.

## Step 3: Nginx Proxy

Add location block to the app's nginx config (see `templates/nginx-postgrest-proxy.conf`):

```nginx
location /rest/v1/ {
    proxy_pass http://127.0.0.1:3334/;   # Strips /rest/v1/ prefix
    proxy_set_header Authorization "";      # Critical: strip JWT header
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Critical:** `proxy_set_header Authorization ""` strips the supabase-js `Bearer <key>` header. PostgREST tries JWT verification and rejects invalid tokens with `PGRST301`. Without this, all requests fail.

## Step 4: Migrate Data from Supabase

Use the anon key to fetch from Supabase, then POST to PostgREST. See `references/supabase-migration.md` for the Python script.

Key pitfalls:
- **Shell quoting breaks**: Complex JSON (attachments with data URLs, special characters) fails with shell `curl`. Use Python's `urllib` directly.
- **Insert one-by-one or small batches**: Large arrays may hit limits.
- **409 Conflict**: Duplicate composite keys. Check what was already inserted.

## Step 5: Update App Config

In `config/deploy.yml` (Kamal) or `.env` (Vite):

```yaml
builder:
  args:
    VITE_SUPABASE_URL: https://fin.rachkun.dev    # Same domain, nginx handles /rest/v1/
    VITE_SUPABASE_PUBLISHABLE_KEY: any-non-empty-value  # PostgREST ignores this
```

The supabase-js client calls `{url}/rest/v1/{table}`. With `url` set to the same domain, requests stay same-origin (no CORS needed).

## Step 6: Watchdog Auto-Restart

Add cron job to ensure containers survive reboots:

```bash
*/5 * * * * /root/.local/bin/ensure-postgrest.sh
```

Script checks `docker ps` for `postgrest` container and curls health endpoint.

---

## Common Pitfalls

| Problem | Cause & Fix |
|---------|-------------|
| `PGRST301: Expected 3 parts in JWT` | supabase-js sends `Authorization: Bearer <key>`. Strip header in nginx: `proxy_set_header Authorization ""` |
| `canceling statement due to statement timeout` (57014) | Supabase free tier overloaded. Self-hosting fixes this. |
| PostgREST image tag not found | Check latest tag: `curl -s 'https://hub.docker.com/v2/repositories/postgrest/postgrest/tags?page_size=5'` |
| Data migration fails with JSON parse error | Shell `curl` breaks on complex JSON. Use Python's `urllib.request` instead. |
| `409 Conflict` on insert | Composite primary key already exists (e.g., categories with type+name). |
| App works but realtime sync broken | PostgREST doesn't support Supabase Realtime WebSockets. Changes require manual refresh. Acceptable for small apps. |

---

## Trade-offs vs Supabase Cloud

| Feature | Supabase Cloud | Self-Hosted PostgREST |
|---------|---------------|----------------------|
| Latency | ~1-2s first call, ~0.2s subsequent | <5ms all calls |
| Timeouts | Free tier: 2s statement timeout | None |
| Realtime | ✅ WebSocket pub/sub | ❌ No realtime (polling or refresh) |
| Auth | ✅ Built-in JWT/RBAC | ⚠️ Anon-only unless JWT configured |
| Maintenance | None | Docker + cron watchdog |
| RAM usage | 0 (cloud) | ~200MB for PG + PostgREST |

---

## References

- `references/supabase-migration.md` — Python migration script and Supabase schema
- `templates/docker-compose-postgrest.yml` — Reusable Docker Compose template
- `templates/nginx-postgrest-proxy.conf` — Nginx location block for proxying supabase-js requests
