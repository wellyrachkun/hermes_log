# Hermes Workspace on VPS: `mode=disconnected` despite running gateway

## Symptom
- Workspace banner: **"Hermes Agent not connected"** / **"Failed to start Hermes Agent"**
- Logs show gateway capabilities missing (`health`, `chatCompletions`, `models`, etc.) and `mode=disconnected`
- `hermes gateway status` is still `active (running)`

## Root cause
On some VPS setups, Hermes gateway and dashboard bind on loopback only:
- `127.0.0.1:8642` (gateway API)
- `127.0.0.1:9119` (dashboard)

If workspace points `HERMES_API_URL` to public IP (e.g. `http://<vps-ip>:8642`), Workspace can fail capability checks even though the process is alive.

## Fix
In `~/hermes-workspace/.env`:

```env
HERMES_API_URL=http://127.0.0.1:8642
HERMES_DASHBOARD_URL=http://127.0.0.1:9119
```

Then restart workspace dev server and refresh UI.

## Verification
```bash
curl -sS http://127.0.0.1:8642/health
ss -tlnp | grep -E ':8642|:9119|:3000'
hermes gateway status
```

Expected:
- health returns JSON with `"status": "ok"`
- listeners visible on expected ports
- gateway status is running

## Notes
- If accessing Workspace from laptop via VS Code Remote-SSH, forward required ports (at least 3000 and 8642; include 9119 if dashboard features are needed).
- If `pnpm dev` in detached mode exits with `tcsetattr: Inappropriate ioctl for device`, run it under `tmux` for stability.
