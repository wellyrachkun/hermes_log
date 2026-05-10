# Hermes Workspace watchdog cron on VPS

Use this when the user says Hermes Workspace keeps dying and wants it automatically restarted.

## Pattern used

Run Workspace in a named tmux session and install a root/user crontab entry that checks health every minute.

Health endpoints/listeners:
- Workspace: `http://127.0.0.1:3000/api/healthcheck` (fallback GET `/`)
- Gateway API: `http://127.0.0.1:8642/health`
- Dashboard: `127.0.0.1:9119` listener

Example script location from this VPS:

```bash
/root/hermes-workspace/scripts/ensure-hermes-workspace.sh
```

Example cron:

```cron
* * * * * /root/hermes-workspace/scripts/ensure-hermes-workspace.sh >/dev/null 2>&1
```

## Script behavior

- Sets stable environment for cron: `HOME=/root`, `XDG_RUNTIME_DIR=/run/user/0`, and Node/pnpm path.
- Checks gateway health; if down, tries `systemctl --user start hermes-gateway` then `hermes gateway start`.
- Checks Workspace health on port 3000.
- If unhealthy, kills the existing `hermes-workspace` tmux session and starts:
  ```bash
  cd /root/hermes-workspace && pnpm dev
  ```
- Writes logs to:
  ```bash
  /root/hermes-workspace/logs/watchdog.log
  /root/hermes-workspace/logs/workspace.log
  ```

## Verification commands

```bash
ss -tlnp | grep -E ':3000|:8642|:9119' || true
curl --max-time 10 -sS http://127.0.0.1:3000/api/healthcheck && echo
curl --max-time 10 -sS http://127.0.0.1:8642/health && echo
tmux ls 2>/dev/null | grep hermes-workspace || true
crontab -l | grep ensure-hermes-workspace.sh || true
tail -n 20 /root/hermes-workspace/logs/watchdog.log
```

## Pitfalls

- Cron has a minimal environment; use absolute paths to `pnpm`, project dir, and script.
- Detached `pnpm dev` can be flaky without a TTY; tmux is safer for Vite dev servers.
- **tmux does not inherit env vars.** When passing `PORT` or other env vars to the Vite dev server inside tmux, inline them into the command string: `PORT=3333 exec pnpm dev`. Setting them before `tmux new-session` has no effect.
- Do not point Workspace at the VPS public IP for backend checks if Hermes gateway binds loopback only. Use `HERMES_API_URL=http://127.0.0.1:8642` and `HERMES_DASHBOARD_URL=http://127.0.0.1:9119`.
- If the workspace port is listening but UI says disconnected, verify gateway health separately; Workspace and gateway are different processes.
