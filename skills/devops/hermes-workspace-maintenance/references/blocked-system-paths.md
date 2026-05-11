# Workspace Files API: Blocked System Paths (v2.3.0)

## The Problem

Workspace v2.3.0's `/api/files` endpoint calls `loadWorkspaceCatalog()` which resolves the active workspace from multiple sources. The fallback chain tries `~/workspace` and `~/work`. But when running as root, `os.homedir()` returns `/root`, and `/root` is in the `blockedSystemSubtrees()` list alongside `/bin`, `/etc`, `/usr`, etc.

The `firstValidDirectory()` helper filters out any path that matches `isBlockedSystemPath()`, so the fallback silently skips `/root/workspace` and returns `null`, resulting in `isValid: false` and error `"No valid workspace selected"`.

## Blocked Paths

```typescript
function blockedSystemSubtrees(): Array<string> {
  return [
    '/bin', '/sbin', '/etc', '/usr', '/boot',
    '/proc', '/sys', '/dev', '/root',
    '/private/etc', '/private/var/db', '/private/var/log',
    'C:/Windows', 'C:/Program Files', 'C:/Program Files (x86)',
  ]
}
```

Any workspace path that is a child of these roots is rejected. This applies to the `firstValidDirectory()` candidate loop and `dedupeWorkspaces()` cleanup.

## Fix

Set `HERMES_WORKSPACE_DIR` env var to a path outside the blocked subtrees:

```bash
HERMES_WORKSPACE_DIR=/root/projects
```

Or any directory not under a blocked parent. Common choices: `/root/projects`, `/root/hermes-workspace`, `/srv/workspace`.

## Workspace Catalog Fallback Chain

`configuredDefaultWorkspace()` tries these sources in order:

1. `HERMES_WORKSPACE_DIR` env var
2. `CLAUDE_WORKSPACE_DIR` env var
3. `HERMES_WEBUI_DEFAULT_WORKSPACE` env var
4. `config.yaml` → `workspace` key
5. `config.yaml` → `default_workspace` key
6. `config.yaml` → `terminal.cwd` key
7. `~/workspace` (blocked when running as root!)
8. `~/work` (blocked when running as root!)
9. Auto-create `~/workspace` (blocked when running as root!)

Without env var #1-#3 being set and without a valid config.yaml entry, all remaining fallbacks are under `/root` and get blocked.

## Watchdog Script

The cron watchdog `/root/.local/bin/ensure-hermes-workspace.sh` must include the env var:

```bash
tmux new-session -d -s "$SESSION" -x 160 -y 48 \
  "cd '$WORKDIR' && \
   HERMES_WORKSPACE_DIR='/root/projects' \
   CLAUDE_KANBAN_BACKEND='claude' \
   HERMES_PASSWORD='!123AdminHermes' \
   TRUST_PROXY=true \
   PORT='$PORT' \
   exec '$PNPM' dev >> '$LOG_DIR/workspace.log' 2>&1"
```
