# Hermes Workspace Watchdog + Safe Update on VPS

Use this when the user says Hermes Workspace keeps dying, asks to auto-restart it, or asks to update the Workspace repo on a VPS.

## Stable watchdog pattern

Keep the watchdog **outside** the `~/hermes-workspace` git repo so `git pull --ff-only` stays clean.

Recommended path:

```bash
/root/.local/bin/ensure-hermes-workspace.sh
```

Root crontab entry:

```cron
* * * * * /root/.local/bin/ensure-hermes-workspace.sh >/dev/null 2>&1
```

Script behavior that worked well:

- export a deterministic PATH including the active Node/pnpm path (`/root/.nvm/versions/node/v24.15.0/bin` in this VPS session)
- check Workspace health with `curl -fsS http://127.0.0.1:3000/api/healthcheck`, falling back to `/`
- check Hermes gateway health with `curl -fsS http://127.0.0.1:8642/health`
- check Hermes dashboard health with `curl -fsS http://127.0.0.1:9119/api/connection-status -o /dev/null`
- if gateway is down, try `systemctl --user start hermes-gateway` then `hermes gateway start`
- if dashboard is down, restart a tmux session named `hermes-dashboard`:
  ```bash
  tmux kill-session -t hermes-dashboard 2>/dev/null || true
  pkill -f "hermes dashboard" 2>/dev/null || true
  tmux new-session -d -s hermes-dashboard -x 120 -y 40 \
    "hermes dashboard --port 9119 --host 127.0.0.1 2>&1 | tee /root/hermes-workspace/logs/dashboard.log"
  ```
- if Workspace is down, restart a tmux session named `hermes-workspace`:
  ```bash
  tmux kill-session -t hermes-workspace 2>/dev/null || true
  PORT="${PORT:-3000}"
  tmux new-session -d -s hermes-workspace -x 160 -y 48 \
    "cd /root/hermes-workspace && PORT='$PORT' exec /root/.nvm/versions/node/v24.15.0/bin/pnpm dev >> /root/hermes-workspace/logs/workspace.log 2>&1"
  ```
  **Important:** The `PORT='$PORT'` before `exec` is critical — `tmux new-session` does NOT inherit environment variables from the calling script. You must explicitly inline them into the command string. Without this, the Vite dev server will ignore the PORT variable and fall back to the default in `vite.config.ts` (3000).
- write watchdog logs to `/root/hermes-workspace/logs/watchdog.log`

## Verification commands

```bash
PORT="${PORT:-3000}"
ss -tlnp | grep -E ":${PORT}|:8642|:9119" || true
curl --max-time 10 -sS "http://127.0.0.1:${PORT}/api/healthcheck" && echo
curl --max-time 10 -sS http://127.0.0.1:8642/health && echo
tmux ls 2>/dev/null | grep hermes-workspace || true
crontab -l | grep ensure-hermes-workspace.sh || true
```

Expected:

- Workspace dev server listening on the configured PORT (default 3000)
- :8642 health endpoint is ok
- :9119 dashboard listener active (returns HTTP response, 401 Unauthorized is fine, means running)
- tmux sessions `hermes-workspace` and `hermes-dashboard` both exist
- crontab points to `/root/.local/bin/ensure-hermes-workspace.sh`

## Safe update workflow

1. Inspect repo and runtime state:
   ```bash
   cd /root/hermes-workspace
   git status --short --branch
   git remote -v
   git log --oneline -5
   tmux ls 2>/dev/null | grep hermes-workspace || true
   crontab -l | grep ensure-hermes-workspace.sh || true
   ```
2. If a watchdog script exists under the repo, move it outside the repo before pulling:
   ```bash
   mkdir -p /root/.local/bin
   cp /root/hermes-workspace/scripts/ensure-hermes-workspace.sh /root/.local/bin/ensure-hermes-workspace.sh
   chmod +x /root/.local/bin/ensure-hermes-workspace.sh
   crontab -l 2>/dev/null | grep -v 'ensure-hermes-workspace.sh' > /tmp/hermes-cron.tmp || true
   printf '* * * * * /root/.local/bin/ensure-hermes-workspace.sh >/dev/null 2>&1\n' >> /tmp/hermes-cron.tmp
   crontab /tmp/hermes-cron.tmp
   rm -f /tmp/hermes-cron.tmp
   rm -f /root/hermes-workspace/scripts/ensure-hermes-workspace.sh
   ```
3. Stash local source edits if present. After `git fetch`, first check whether upstream already contains equivalent fixes before reapplying/dropping the stash.
4. Update/build:
   ```bash
   git pull --ff-only origin main
   pnpm install --frozen-lockfile
   pnpm build
   ```
5. Restart with the watchdog and verify (replace PORT if changed from default):
   ```bash
   PORT="${PORT:-3000}"
   tmux kill-session -t hermes-workspace 2>/dev/null || true
   /root/.local/bin/ensure-hermes-workspace.sh
   curl --max-time 10 -sS "http://127.0.0.1:${PORT}/api/healthcheck" && echo
   ```

## Pitfalls

- **tmux does not inherit env vars.** When passing environment variables (PORT, NODE_ENV, etc.) to the Vite dev server inside a tmux session, you must inline them into the command string: `PORT='$PORT' exec pnpm dev`. Setting them before `tmux new-session` has no effect inside the session.
- A repo-local watchdog script appears as an untracked file and can obstruct or confuse future Workspace updates. Store durable operational scripts under `/root/.local/bin` instead.
- `pnpm dev` is more reliable under `tmux` than detached non-TTY runners for long-lived Vite/TanStack dev servers.
- Do not assume build warnings are blockers. Route-file warnings and large-chunk warnings can be non-fatal; rely on exit code plus health checks.
- If local hotfixes were stashed, compare against updated upstream before reapplying. In one session, upstream already had the `ClaudeOnboarding` and `assistantCorruptionWarning` fixes, so the stash could be dropped after confirming the symbols existed.
- **Dashboard dies after `hermes update`.** The `hermes dashboard` process on :9119 is separate from the workspace-embedded gateway. After a `hermes update`, the dashboard binary changes and the old process exits — the watchdog must restart it. Ensure the watchdog manages a `hermes-dashboard` tmux session and checks `http://127.0.0.1:9119/api/connection-status`.

## Changing the workspace port

The workspace defaults to port 3000 (`vite.config.ts` and `server-entry.js` both read `process.env.PORT`). To change it, you need coordinated edits in 3 places:

1. **Watchdog script** — change the `PORT` default and ensure it's passed into tmux:
   ```bash
   PORT="${PORT:-3333}"   # new default
   # and in the tmux command:
   "cd /root/hermes-workspace && PORT='$PORT' exec pnpm dev ..."
   ```
2. **Nginx reverse proxy** — update `proxy_pass` in the site config:
   ```nginx
   proxy_pass http://127.0.0.1:3333;   # was :3000
   ```
3. **Reload/restart** — `sudo systemctl reload nginx`, kill the old tmux session, and let the watchdog restart it on the new port.

Verify with `ss -tlnp | grep :3333` and `curl http://127.0.0.1:3333/api/healthcheck`.
