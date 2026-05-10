# Running Dev Servers in Background

When developing Hermes Agent (or any Node/Rails project) on a remote server, the dev server (`vite dev`, `rails s`, etc.) must stay alive after the terminal session ends.

---

## Hermes Terminal Tool (Recommended)

Use the terminal tool with `background: true`:

```json
{
  "command": "cd ~/hermes-workspace && pnpm dev",
  "background": true,
  "timeout": 300
}
```

**Check status:**
```json
{
  "action": "poll",
  "session_id": "proc_xxxx"
}
```

**View logs:**
```json
{
  "action": "log",
  "session_id": "proc_xxxx",
  "limit": 50
}
```

**Kill process:**
```json
{
  "action": "kill",
  "session_id": "proc_xxxx"
}
```

---

## Port Check

Verify the server is listening:

```bash
ss -tlnp | grep -E "3000|5173|8080"
```

| Port | Common use |
|------|-----------|
| 3000 | Next.js, Hermes workspace |
| 5173 | Vite default |
| 8080 | Generic fallback |

## HTTP Verification

After the listener appears, verify with an actual GET request:

```bash
curl -v --max-time 20 http://127.0.0.1:3000/ -o /tmp/hermes-workspace-index.html
curl -s --max-time 10 http://127.0.0.1:8642/health && echo
```

If `curl -I`/HEAD hangs or times out immediately after startup, retry with GET before assuming the dev server is broken; Vite/Hermes Workspace can accept the socket before it is fully ready to answer HEAD.

---

## Manual tmux Alternative

If the terminal tool's background mode is not available, use tmux:

```bash
# Start
tmux new-session -d -s devserver -x 120 -y 40 'cd ~/hermes-workspace && pnpm dev'

# View logs
tmux capture-pane -t devserver -p

# Kill
tmux kill-session -t devserver
```

---

## Pitfalls

| Problem | Cause & Fix |
|---------|-------------|
| Output appears empty | Background processes buffer stdout. Use `poll`/`log` actions rather than expecting immediate terminal output. |
| Port already in use | Previous dev server still running. Kill old session or use a different port (`pnpm dev -- --port 3001`). |
| `ELIFECYCLE` + `tcsetattr: Inappropriate ioctl for device` | `pnpm dev` was started without a real TTY (common with detached/background runners). Prefer `tmux` for long-lived interactive dev servers (Vite/HMR) on VPS. |
| UI says "Hermes Agent not connected" while dev server is up | Verify gateway health separately: `curl http://127.0.0.1:8642/health`. Workspace can run on `:3000` but still show disconnected if API endpoint/token/env is wrong. |
| Process dies on logout | Use `background: true` (Hermes handles it) or run inside tmux/screen. |
