# Static SPA Kamal Deploy Session Notes

Use these notes for client-only Vite/React SPAs deployed with Kamal + nginx.

## Pattern that worked

1. Commit source and generated `dist/` before deploy when the repo tracks `dist/`.
2. Run `kamal deploy`; Kamal builds from a clean git clone at committed `HEAD`, so uncommitted fixes are ignored.
3. Expect Docker build assets to have different hashed filenames than the local `dist/` if build-time env args differ from local env. Verify the production `index.html` asset refs, not just local `dist/` names.
4. Verify in layers:
   - `kamal app details` or remote `docker ps --filter label=service=<service>` shows the expected commit-tagged image and `healthy` status.
   - From the VPS, curl the Kamal proxy with Host header: `curl -sSI -H 'Host: <domain>' http://127.0.0.1:<proxy-port>`.
   - Browser-check the public domain and inspect loaded script/style URLs.

## Useful commands

```bash
git status --short --branch
git rev-parse --short HEAD
kamal deploy
kamal app details
ssh root@<host> "curl --max-time 10 -sSI -H 'Host: <domain>' http://127.0.0.1:<proxy-port>"
```

To inspect production asset refs without executing remote content as code:

```bash
curl -sS https://<domain> | grep -o 'assets/index-[^" ]*' | sort -u
ssh root@<host> "curl -sS -H 'Host: <domain>' http://127.0.0.1:<proxy-port>" | grep -o 'assets/index-[^" ]*' | sort -u
```

## Pitfalls

- Do not paste or persist secret values from `config/deploy.yml`, `.kamal/secrets`, or build logs. Redact them in reports.
- If public `curl https://<domain>` hangs/timeouts from the agent environment, do not assume deploy failed. Check the app from the VPS loopback proxy and with a browser navigation tool.
- Hashed assets may be cacheable for days. If the browser still shows old UI after a successful deploy, advise hard refresh/clear site data.
