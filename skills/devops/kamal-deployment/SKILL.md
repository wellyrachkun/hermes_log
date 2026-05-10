---
name: kamal-deployment
description: "Deploy apps with Kamal on single VPS setups, including coexistence with existing Nginx on ports 80/443 and troubleshooting proxy healthchecks."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [Kamal, Docker, Nginx, Deployment, VPS]
    related_skills: [remote-dev-setup]
---

# Kamal Deployment

Use this skill when deploying apps with Kamal, especially on a VPS that already has Nginx bound to `:80/:443`.

## Trigger
- User asks to deploy with Kamal
- Existing server already hosts other sites on Nginx
- `kamal deploy` fails with health/proxy/port issues

## Baseline Steps

1. **Verify prerequisites**
   - `docker --version`
   - `kamal version` (install Ruby + gem `kamal` if missing)

2. **Prepare app container**
   - Ensure `Dockerfile` exists
   - For static SPA, use Nginx image with SPA fallback (`try_files ... /index.html`)
   - Add `/up` endpoint and Docker `HEALTHCHECK`

3. **Create Kamal config** (`config/deploy.yml`)
   - Define `service`, `image`, `servers`, `registry`, `env`
   - If host Nginx handles TLS/public traffic, use `proxy.ssl: false`

4. **Secrets handling**
   - Put registry token in `.kamal/secrets`
   - Ensure `.kamal/secrets` is gitignored

5. **Commit deployment config before `kamal setup/deploy`**
   - Kamal builds from a git clone of current repo state
   - Uncommitted config changes are ignored

## Single-VPS + Existing Nginx Pattern (Recommended)

When host Nginx already uses ports 80/443:

1. Set Kamal proxy publish to loopback only:
   - `/root/.kamal/proxy/options`
   - `--publish 127.0.0.1:9080:80 --log-opt max-size=10m`

2. Keep Kamal `proxy.ssl: false` (TLS terminated by host Nginx)

3. Host Nginx vhost should reverse-proxy domain to `127.0.0.1:9080`

4. Issue TLS cert on host Nginx (e.g., `certbot --nginx -d domain --redirect`)

## Troubleshooting

### A) `failed to bind host port 80` for kamal-proxy
Cause: port 80 already used by host Nginx.
Fix: use loopback publish in `/root/.kamal/proxy/options` and recreate kamal-proxy.

### B) Kamal says target unhealthy but app container logs look fine
Check `docker logs kamal-proxy`.
If you see DNS lookup failures to container IDs (e.g., lookup `<container-id>` on `127.0.0.53`):
- Recreate Kamal network/proxy cleanly:
  - `docker rm -f kamal-proxy`
  - `docker network rm kamal`
  - rerun `kamal setup`
- Ensure new `kamal-proxy` attaches to `kamal` network correctly.

### C) Unexpected `--tls` in deploy command
Usually stale config or old deployed settings.
Fix:
- Confirm `proxy.ssl` in `config/deploy.yml`
- Re-run setup/deploy after confirming committed config

### D) MySQL accessory reboot appears to erase production data
Cause: if `accessories.db` lacks a stable `directories:` mount, recreating/rebooting the accessory can attach a new anonymous Docker volume. The old data may still exist in another anonymous volume.

Fix discipline:
- First confirm the target VPS/project with the user before touching production DB accessories.
- Inspect current container mount and all candidate MySQL volumes before changing anything.
- Back up the currently attached volume before swapping volumes.
- Stop/remove any stale inspection container that mounts the candidate volume; otherwise MySQL can fail with `Unable to lock ./ibdata1 error: 11`.
- After revert, verify both `/up` and a data-bearing endpoint, not health alone.
- See `references/kamal-mysql-accessory-volume-revert.md` for exact commands and recovery pattern.

### E) Vite/SPA env vars not reflected in production
Symptom: app runs, but `import.meta.env.VITE_*` appears empty/fallback mode in browser.

Cause:
- For static frontend builds (Vite), env vars are embedded at **build time**, not container runtime.
- `kamal env secret` affects runtime container env; it does not automatically fix already-built `dist/` assets.
- Kamal deploy builds from a git clone of HEAD; uncommitted local fixes are ignored.

Fix:
1. Ensure env is available during image build (builder args or a generated `.env.production` before `npm run build`).
2. If using `${VAR}` in `builder.args`, make sure those vars are exported in the shell that runs `kamal deploy` (do not assume `.kamal/secrets` populates build args).
3. Commit config/Dockerfile changes before deploy (Kamal clones committed state only).
4. Redeploy and verify by checking served asset contains expected public values (e.g., Supabase URL/anon key string present in bundled JS).

## Verification Checklist

- `docker ps` shows app container + `kamal-proxy` up
- `curl -I -H 'Host: <domain>' http://127.0.0.1:9080` returns `200`
- `curl -I https://<domain>` returns `200`
- Browser loads domain with valid cert

## Case-Only Deploy from a Dirty Working Tree

Use this when the user asks to commit/deploy only one fix while unrelated files are modified locally:

1. Inspect dirty state before staging:
   ```bash
   git status --short --branch
   git diff -- <relevant files>
   ```
2. Stage and commit only the files for the requested case:
   ```bash
   git add <case-file-1> <case-file-2>
   git commit -m "fix: concise case-specific message"
   ```
3. Run targeted tests before deploy if not already verified.
4. Deploy from the committed SHA. Kamal builds from a git clone of the current repo and ignores uncommitted changes, so a dirty tree is acceptable only after confirming the relevant fix is committed. Watch deploy output for `Building from a local git clone, so ignoring these uncommitted changes` and confirm the ignored files are unrelated.
5. Verify production with a direct healthcheck and the changed endpoint/behavior, not just container status:
   ```bash
   curl -fsS -I https://<domain>/up
   curl -fsS https://<domain>/<changed-endpoint> -o /tmp/response.json
   python3 - <<'PY'
   import json
   print(json.dumps(json.load(open('/tmp/response.json')), indent=2)[:2000])
   PY
   ```
   Avoid `curl | ruby/python/sh` patterns; security scanners may block pipe-to-interpreter commands. Save to a temp file, then parse it.
6. Push the commit after successful deploy unless the user explicitly wants local-only deployment.
7. Final report should name the commit SHA, deploy status, production verification result, and explicitly state that unrelated uncommitted files were not included.

## Deployment Freshness Audit

Use this when the user says they may have forgotten to deploy or asks whether production is current:

1. Check repository state:
   - `git status --short --branch`
   - `git rev-parse HEAD && git rev-parse origin/main`
   - `git log --oneline -5`
2. Check running Kamal image/tag:
   - `docker ps --filter label=service=<service> --format '{{.Names}} {{.Image}} {{.Status}}'`
   - `kamal app details`
3. Compare the running image tag/commit hash with `HEAD`.
   - If the container image tag is an older commit than `HEAD`, report that the app is online but latest commit is not deployed.
   - Show `git log --oneline <deployed-short-sha>..HEAD` to list commits pending deployment.
4. Verify production is reachable:
   - `curl -sS -I https://<domain> | sed -n '1,12p'`
   - optionally curl the main JS/CSS asset from returned HTML for SPA deployments.
5. Keep the final report concise: current deployed SHA, latest SHA, pending commits, health/reachability, and whether deployment is needed.

## Missing Frontend Feature After Deploy

Use this when production is healthy but the user says a newly committed frontend feature is absent:

1. Do the **Deployment Freshness Audit** first; healthy `200 OK` does not prove production is on the latest commit.
2. For static SPA builds, inspect the asset that production `index.html` actually references:
   - `curl -sS https://<domain> | grep -o 'assets/index-[^" ]*'`
   - `curl -sS -H 'Host: <domain>' http://127.0.0.1:<proxy-port> | grep -o 'assets/index-[^" ]*'`
3. Compare with the current repo/build output. Kamal rebuilds from the committed repo, so the final asset hash can differ from committed `dist/`; trust the production `index.html` reference.
4. Probe for feature-specific strings in the served JS/CSS bundle:
   - `curl -sS https://<domain>/<asset.js> | grep -o -E 'featureFlag|Known UI Text|db_column' | sort | uniq -c`
5. If production is current but the user still sees old UI, check `Cache-Control` on previous hashed assets and advise hard refresh/clear site data. Long-lived hashed JS/CSS (e.g. `max-age=604800`) can make the browser hold the old UI.

## References

- `references/kamal-single-vps-nginx.md` — concrete failure signatures and fixed commands from a real session.
- `references/vite-buildtime-env-with-kamal.md` — Vite `import.meta.env` build-time behavior, empty build-arg signature, and verification pattern.
- `references/static-frontend-version-verification.md` — diagnosing missing frontend features after deploy by comparing git commit, Docker image tag, production index asset, and feature strings.
- `references/static-spa-kamal-deploy-session.md` — concise deploy/verify recipe for Vite/React static SPAs with committed `dist/`, hashed assets, loopback proxy checks, and cache pitfalls.
- `references/kamal-mysql-accessory-volume-revert.md` — recovering/reverting MySQL accessory data after anonymous-volume changes or accidental accessory reboot.
