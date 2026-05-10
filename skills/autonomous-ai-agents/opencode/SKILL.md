---
name: opencode
description: "Delegate coding to OpenCode CLI (features, PR review)."
version: 1.3.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [Coding-Agent, OpenCode, Autonomous, Refactoring, Code-Review]
    related_skills: [claude-code, codex, hermes-agent]
---

# OpenCode CLI

Use [OpenCode](https://opencode.ai) as an autonomous coding worker orchestrated by Hermes terminal/process tools. OpenCode is a provider-agnostic, open-source AI coding agent with a TUI and CLI.

## When to Use

- User explicitly asks to use OpenCode
- You want an external coding agent to implement/refactor/review code
- You need long-running coding sessions with progress checks
- You want parallel task execution in isolated workdirs/worktrees

## Prerequisites

- OpenCode installed: `npm i -g opencode-ai@latest` or `brew install anomalyco/tap/opencode`
- Auth configured: `opencode auth login` or set provider env vars (OPENROUTER_API_KEY, etc.)
- Verify: `opencode auth list` should show at least one provider
- Git repository for code tasks (recommended)
- `pty=true` for interactive TUI sessions

## Binary Resolution (Important)

Shell environments may resolve different OpenCode binaries. If behavior differs between your terminal and Hermes, check:

```
terminal(command="which -a opencode")
terminal(command="opencode --version")
```

If needed, pin an explicit binary path:

```
terminal(command="$HOME/.opencode/bin/opencode run '...'", workdir="~/project", pty=true)
```

## One-Shot Tasks

Use `opencode run` for bounded, non-interactive tasks:

```
terminal(command="opencode run 'Add retry logic to API calls and update tests'", workdir="~/project")
```

Attach context files with `-f`:

```
terminal(command="opencode run 'Review this config for security issues' -f config.yaml -f .env.example", workdir="~/project")
```

Show model thinking with `--thinking`:

```
terminal(command="opencode run 'Debug why tests fail in CI' --thinking", workdir="~/project")
```

Force a specific model:

```
terminal(command="opencode run 'Refactor auth module' --model openrouter/anthropic/claude-sonnet-4", workdir="~/project")
```

## Interactive Sessions (Background)

For iterative work requiring multiple exchanges, start the TUI in background:

```
terminal(command="opencode", workdir="~/project", background=true, pty=true)
# Returns session_id

# Send a prompt
process(action="submit", session_id="<id>", data="Implement OAuth refresh flow and add tests")

# Monitor progress
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Send follow-up input
process(action="submit", session_id="<id>", data="Now add error handling for token expiry")

# Exit cleanly — Ctrl+C
process(action="write", session_id="<id>", data="\x03")
# Or just kill the process
process(action="kill", session_id="<id>")
```

**Important:** Do NOT use `/exit` — it is not a valid OpenCode command and will open an agent selector dialog instead. Use Ctrl+C (`\x03`) or `process(action="kill")` to exit.

### TUI Keybindings

| Key | Action |
|-----|--------|
| `Enter` | Submit message (press twice if needed) |
| `Tab` | Switch between agents (build/plan) |
| `Ctrl+P` | Open command palette |
| `Ctrl+X L` | Switch session |
| `Ctrl+X M` | Switch model |
| `Ctrl+X N` | New session |
| `Ctrl+X E` | Open editor |
| `Ctrl+C` | Exit OpenCode |

### Resuming Sessions

After exiting, OpenCode prints a session ID. Resume with:

```
terminal(command="opencode -c", workdir="~/project", background=true, pty=true)  # Continue last session
terminal(command="opencode -s ses_abc123", workdir="~/project", background=true, pty=true)  # Specific session
```

## Common Flags

| Flag | Use |
|------|-----|
| `run 'prompt'` | One-shot execution and exit |
| `serve` | Start headless web server (no TUI) |
| `web` | Start web server + open browser |
| `--continue` / `-c` | Continue the last OpenCode session |
| `--session <id>` / `-s` | Continue a specific session |
| `--agent <name>` | Choose OpenCode agent (build or plan) |
| `--model provider/model` | Force specific model |
| `--port <number>` | Fixed port for serve/web (default: 0 = random) |
| `--hostname <ip>` | Bind address for serve/web (default: 127.0.0.1) |
| `--format json` | Machine-readable output/events |
| `--file <path>` / `-f` | Attach file(s) to the message |
| `--thinking` | Show model thinking blocks |
| `--variant <level>` | Reasoning effort (high, max, minimal) |
| `--title <name>` | Name the session |
| `--attach <url>` | Connect to a running opencode server |

## Procedure

1. Verify tool readiness:
   - `terminal(command="opencode --version")`
   - `terminal(command="opencode auth list")`
2. For bounded tasks, use `opencode run '...'` (no pty needed).
3. For iterative tasks, start `opencode` with `background=true, pty=true`.
4. Monitor long tasks with `process(action="poll"|"log")`.
5. If OpenCode asks for input, respond via `process(action="submit", ...)`.
6. Exit with `process(action="write", data="\x03")` or `process(action="kill")`.
7. Summarize file changes, test results, and next steps back to user.

## PR Review Workflow

OpenCode has a built-in PR command:

```
terminal(command="opencode pr 42", workdir="~/project", pty=true)
```

Or review in a temporary clone for isolation:

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && opencode run 'Review this PR vs main. Report bugs, security risks, test gaps, and style issues.' -f $(git diff origin/main --name-only | head -20 | tr '\n' ' ')", pty=true)
```

## Parallel Work Pattern

Use separate workdirs/worktrees to avoid collisions:

```
terminal(command="opencode run 'Fix issue #101 and commit'", workdir="/tmp/issue-101", background=true, pty=true)
terminal(command="opencode run 'Add parser regression tests and commit'", workdir="/tmp/issue-102", background=true, pty=true)
process(action="list")
```

## Session & Cost Management

List past sessions:

```
terminal(command="opencode session list")
```

Check token usage and costs:

```
terminal(command="opencode stats")
terminal(command="opencode stats --days 7 --models anthropic/claude-sonnet-4")
```

## Web Server (`serve` / `web`)

OpenCode has a built-in web UI served by `opencode serve` (headless) or `opencode web` (server + opens browser). Use `serve` on headless servers:

```bash
opencode serve --port 32123 --hostname 127.0.0.1
```

Key flags:
- `--port <number>` — **required** for fixed port; default `0` picks a random port
- `--hostname <ip>` — bind address (default `127.0.0.1`; use `0.0.0.0` only if exposing directly)
- `--cors <domain>` — allow CORS from additional origins

### Subdomain Required (Not Subpath)

The web UI uses **absolute paths** for all assets and API routes (`/assets/...`, `/api/session`, `/agent`, `/event`, `/file`, etc.). This means:

- ❌ **Cannot serve under a subpath** like `/opencode` — nginx `proxy_pass` + `sub_filter` won't work reliably because JS bundles reference root paths.
- ✅ **Must use a dedicated subdomain** like `opencode.rachkun.dev` with nginx reverse proxy at `/`.

### Security

`opencode serve` runs **unsecured by default** and logs a warning:

```
Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.
```

To password-protect the web UI, set the env var:

```bash
OPENCODE_SERVER_PASSWORD="your-password" opencode serve --port 32123 --hostname 127.0.0.1
```

When running via a tmux/cron watchdog, add `export OPENCODE_SERVER_PASSWORD=...` to the script.

### Subdomain + DNS + SSL Setup

Full setup flow for exposing `opencode serve` via HTTPS:

1. Create nginx config in `/etc/nginx/sites-available/<subdomain>` with HTTP only first.
2. Add DNS A record for the subdomain pointing to the VPS IP.
3. Verify DNS propagation: `dig +short <subdomain> @8.8.8.8`
4. Run certbot: `sudo certbot --nginx -d <subdomain> --non-interactive --agree-tos --email <email>`
5. Certbot auto-adds SSL lines and enables HTTPS redirect.

### WebSocket Support

The web UI uses WebSockets for real-time communication. Nginx must forward Upgrade headers:

```nginx
location / {
    proxy_pass http://127.0.0.1:32123;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Auto-Restart via Cron Watchdog

Use a tmux-based watchdog script (see `templates/watchdog.sh`) added to crontab:

```bash
*/5 * * * * /root/.local/bin/ensure-opencode-web.sh
```

The watchdog checks `http://127.0.0.1:<port>/`, kills stale tmux sessions/processes, and restarts `opencode serve` inside a named tmux session for easy log inspection.

> **Template:** `templates/watchdog.sh` — copy to `/root/.local/bin/`, customize PORT/SESSION/LOG_DIR, `chmod +x`, add to crontab.

## Pitfalls

- Interactive `opencode` (TUI) sessions require `pty=true`. The `opencode run` command does NOT need pty.
- `/exit` is NOT a valid command — it opens an agent selector. Use Ctrl+C to exit the TUI.
- PATH mismatch can select the wrong OpenCode binary/model config.
- If OpenCode appears stuck, inspect logs before killing:
  - `process(action="log", session_id="<id>")`
- Avoid sharing one working directory across parallel OpenCode sessions.
- Enter may need to be pressed twice to submit in the TUI (once to finalize text, once to send).
- **Web UI uses absolute paths** — cannot be served under a subpath (`/opencode`). Must use a dedicated subdomain.
- `opencode serve` defaults to `--port 0` (random port). Always use `--port` with a fixed number for reverse proxy setups.
- When proxying behind nginx, include WebSocket upgrade headers or the web UI will fail to connect.
- `opencode serve` can be unstable and crash silently. Always pair it with a cron watchdog (see template). Check `/var/log/opencode/opencode.log` for crash reasons.
- The web server runs **unsecured by default**. Set `OPENCODE_SERVER_PASSWORD` if exposing beyond localhost.
- When password is set, the server returns HTTP 401 on `/`. Health checks must accept both 200 and 401 (see template).
- **Do NOT run `pkill -f "opencode serve"` inline** in the same terminal/tmux session as the agent — it can kill the parent process and abort your terminal tool call with exit code -15 (SIGTERM). Let the cron watchdog handle process cleanup, or use `tmux kill-session -t opencode-web` first, then `pkill` with a focused pattern like `pkill -f "opencode serve.*PORT"`.

## Verification

Smoke test:

```
terminal(command="opencode run 'Respond with exactly: OPENCODE_SMOKE_OK'")
```

Success criteria:
- Output includes `OPENCODE_SMOKE_OK`
- Command exits without provider/model errors
- For code tasks: expected files changed and tests pass

## Rules

1. Prefer `opencode run` for one-shot automation — it's simpler and doesn't need pty.
2. Use interactive background mode only when iteration is needed.
3. Always scope OpenCode sessions to a single repo/workdir.
4. For long tasks, provide progress updates from `process` logs.
5. Report concrete outcomes (files changed, tests, remaining risks).
6. Exit interactive sessions with Ctrl+C or kill, never `/exit`.
