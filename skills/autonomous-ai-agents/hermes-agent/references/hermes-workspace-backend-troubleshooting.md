# Hermes Workspace Backend Troubleshooting

Use this when Hermes Workspace shows onboarding such as "Welcome! Let's connect your backend", reports `mode=disconnected`, or logs a gateway URL that should be reachable but is not.

## Known-good local setup

Hermes Workspace needs two Hermes services for full zero-fork mode:

- Gateway API: `http://127.0.0.1:8642`
- Dashboard API: `http://127.0.0.1:9119`

Verify services:

```bash
ss -tlnp | grep -E ':3000|:8642|:9119' || true
curl -sS http://127.0.0.1:8642/health
curl -sS http://127.0.0.1:9119/api/status
curl -sS http://127.0.0.1:3000/api/gateway-status | python3 -m json.tool | head -80
```

Expected `gateway-status` shape:

```json
{
  "mode": "zero-fork",
  "claudeUrl": "http://127.0.0.1:8642",
  "dashboardUrl": "http://127.0.0.1:9119",
  "gateway": { "available": true },
  "dashboard": { "available": true }
}
```

`/api/connection-status` may still report `mode: portable`; for full debugging prefer `/api/gateway-status` because it exposes core capabilities and dashboard detection.

## Common pitfall: inherited public IP URL

When Workspace is launched from inside Hermes Agent or the gateway service cgroup, it can inherit variables from `~/.hermes/.env`. If that file contains a public VPS URL such as:

```bash
HERMES_API_URL=http://<public-ip>:8642
```

but the gateway is listening only on loopback:

```bash
127.0.0.1:8642
```

Workspace will show disconnected/onboarding even though the gateway is healthy locally.

Check the actual Vite process environment:

```bash
PID=$(ss -tlnp | awk '/:3000/{match($0,/pid=([0-9]+)/,a); print a[1]; exit}')
[ -n "$PID" ] && tr '\0' '\n' < /proc/$PID/environ | grep -E '^(HERMES_API_URL|CLAUDE_API_URL|HERMES_DASHBOARD_URL|CLAUDE_DASHBOARD_URL)=' || true
```

Fix local dev by setting both Workspace and Hermes env to localhost, then restart Workspace:

```bash
# /root/hermes-workspace/.env
HERMES_API_URL=http://127.0.0.1:8642
HERMES_DASHBOARD_URL=http://127.0.0.1:9119

# ~/.hermes/.env if Workspace is launched via Hermes/background process
HERMES_API_URL=http://127.0.0.1:8642
HERMES_DASHBOARD_URL=http://127.0.0.1:9119
```

Restart the dev server with env overrides cleared if needed:

```bash
cd /root/hermes-workspace
env -u HERMES_API_URL -u CLAUDE_API_URL -u HERMES_DASHBOARD_URL -u CLAUDE_DASHBOARD_URL pnpm dev
```

## Start missing services

```bash
hermes gateway status || hermes gateway start
hermes dashboard --no-open
cd /root/hermes-workspace && pnpm dev
```

Dashboard may build before binding to `127.0.0.1:9119`; wait and re-check `ss -tlnp`.

## Browser state

If the backend is fixed but onboarding still appears, hard refresh or clear the onboarding flag:

```js
localStorage.removeItem('claude-onboarding-complete'); location.reload();
```

The app should auto-set onboarding complete after `/api/connection-status` succeeds.

## Related issue: undefined onboarding component

If the browser throws `HermesOnboarding is not defined`, inspect `src/routes/__root.tsx`. In the observed Workspace version, the imported component was `ClaudeOnboarding`, but render code used `<HermesOnboarding />`. Fix to:

```tsx
{mounted && rootSurfaceState.showOnboarding ? <ClaudeOnboarding /> : null}
```

Run:

```bash
cd /root/hermes-workspace
pnpm build
pnpm exec vitest run src/routes/-root-layout-state.test.ts src/routes/-root-layout-utils.test.ts --reporter=dot
```
