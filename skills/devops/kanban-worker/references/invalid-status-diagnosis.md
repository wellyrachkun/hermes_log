# Kanban Invalid Status Diagnosis

## Symptom
User reports "kanban task not being processed" — task sits idle despite dispatcher running.

## Root cause
Task has a status that the dispatcher doesn't recognise. The dispatcher only operates on these statuses:
- `triage` → specifier promotes to `todo`
- `todo` → dispatcher promotes to `ready` when all parents are done
- `ready` → dispatcher claims and spawns worker
- `running` → worker is active
- `blocked` → needs human unblock
- `done` / `archived` → terminal

Any other status (e.g. `queued`) is invisible to the dispatcher — the task will never be picked up.

## Diagnosis steps

```bash
# 1. Check overall board state
hermes kanban stats

# 2. List all tasks with status
hermes kanban list --json | python3 -c "
import sys,json
tasks=json.load(sys.stdin)
for t in tasks:
    print(f'{t[\"id\"]} | {t[\"status\"]:10s} | {t[\"assignee\"]:15s} | {t[\"title\"][:80]}')
"

# 3. Check dispatcher dry-run (shows what it WOULD do)
hermes kanban dispatch --dry-run

# 4. Verify the task's raw status in SQLite
sqlite3 ~/.hermes/kanban.db "SELECT id, status, assignee FROM tasks WHERE id='<task_id>';"
```

## Fix

```bash
# Update to valid status
sqlite3 ~/.hermes/kanban.db "UPDATE tasks SET status = 'ready' WHERE id = '<task_id>';"

# Trigger dispatch
hermes kanban dispatch
```

## Prevention
When creating tasks via `/kanban create` in Discord or `hermes kanban create` in CLI, the status is always set to a valid value (`ready` or `todo`). The `queued` status appears to come from a non-standard creation path — avoid direct SQL INSERTs or dashboard API calls that bypass the normal creation flow.
