# Static Frontend Version Verification After Kamal Deploy

Use when a static SPA is reachable but a recently committed feature is missing in production.

## Session pattern

A Vite/React app deployed via Kamal showed `200 OK` and a healthy container, but the user could not see a newly committed feature. The issue was not app downtime; production was still running an older image tag.

Useful checks:

```bash
# Source freshness
git status --short --branch
git log --oneline -5
git rev-parse HEAD
git rev-parse origin/main

# Running image/tag
docker ps --filter label=service=<service> --format '{{.Names}} {{.Image}} {{.Status}}'
kamal app details

# Pending commits if deployed tag is older
git log --oneline <deployed-short-sha>..HEAD
```

For static frontend bundles, check the actual asset served by production:

```bash
curl -sS https://<domain> | grep -o 'assets/index-[^" ]*'
curl -sS -H 'Host: <domain>' http://127.0.0.1:<proxy-port> | grep -o 'assets/index-[^" ]*'
```

Then verify feature code exists in the served bundle:

```bash
curl -sS https://<domain>/<asset.js> \
  | grep -o -E 'featureFlag|Known UI Text|db_column' \
  | sort | uniq -c
```

## Notes

- Do not rely on `200 OK`, app health, or proxy health alone to answer whether a feature is deployed.
- Kamal builds from a clean clone of the committed repo at `HEAD`; uncommitted changes are ignored.
- Vite/Rolldown can generate a different JS hash during Kamal build than the committed `dist/` file. The authoritative check is production `index.html` and the asset it references.
- If the correct asset is live but the user still sees old UI, old hashed JS/CSS may be cached by the browser/CDN. Check headers with `curl -I https://<domain>/<old-asset.js>` and advise hard refresh / clear site data when appropriate.
