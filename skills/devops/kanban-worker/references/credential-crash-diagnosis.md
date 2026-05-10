# Kanban Worker Credential Crash — Diagnostic Recipe

When a Kanban worker spawns and immediately crashes (1 min elapsed, every time), credential/auth failure is the most likely cause.

## Quick check

```bash
# 1. See the crash pattern
hermes kanban runs <task_id>

# 2. Read the worker log — look for "No X credentials stored"
hermes kanban log <task_id> | grep -i "credential\|auth\|error"

# 3. Check the profile's provider and auth status
hermes profile show <profile_name>
hermes auth status <provider>
```

## Confirm the worker can run standalone

```bash
# Run the profile directly from CLI to isolate Kanban dispatch issues
HERMES_PROFILE=<name> hermes -z "hello"
```

If this works but Kanban worker still crashes, the credential may have been added after the worker spawned — wait for the next dispatcher cycle.

## Example: openai-codex

Profile configured with `openai-codex` provider, model `gpt-5.5`. Worker log shows:

```
No Codex credentials stored. Run `hermes auth` to authenticate.
```

Fix:
```bash
# Add OAuth device code credential
hermes auth add openai-codex

# Verify
hermes auth status openai-codex
# Expected: "openai-codex: logged in"
```

The credential is stored as `oauth device_code` in `<profile>/auth.json`. The dispatcher respawns crashed tasks every ~60s (`kanban.dispatch_interval_seconds`), so the next spawn after fixing auth will succeed.

## Environment check for spawned workers

Workers are spawned via:
```
/usr/local/lib/hermes-agent/venv/bin/hermes -p <profile> --skills kanban-worker chat -q work kanban task <id>
```

Environment includes `HERMES_PROFILE=<name>`, `HERMES_HOME=/root/.hermes`. Check a running worker's env:
```bash
cat /proc/<pid>/environ | tr '\0' '\n' | grep HERMES
```
