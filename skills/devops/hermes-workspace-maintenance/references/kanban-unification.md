# Kanban Task-Board Unification (v2.3.0)

## What Changed

Before v2.3.0, the Workspace task board (`/api/claude-tasks`) stored tasks in `~/.hermes/tasks.json` — a standalone JSON file completely separate from `hermes kanban` CLI which used `~/.hermes/kanban.db` (SQLite).

In v2.3.0, the backend was replaced. Now `/api/claude-tasks` → `claude-tasks-backend.ts` → `kanban-backend.ts` → auto-detects the best kanban source.

## Backend Detection Flow

```
resolveKanbanBackend()
  ├── CLAUDE_KANBAN_BACKEND=local     → localBackend (swarm-kanban.json)
  ├── CLAUDE_KANBAN_BACKEND=claude    → claudeBackend (direct SQLite)
  ├── CLAUDE_KANBAN_BACKEND=proxy     → dashboardProxyBackend (HTTP to :9119)
  └── CLAUDE_KANBAN_BACKEND=auto      → (default)
       ├── caps.kanban? → dashboardProxyBackend
       ├── claudeBackend.meta().detected? → claudeBackend
       └── localBackend
```

## claudeBackend (Direct SQLite)

Reads `~/.hermes/kanban.db` by shelling out to `sqlite3` CLI:

```typescript
function runSqlite(dbPath: string, sql: string): string {
  return execFileSync('sqlite3', [dbPath, '-json', sql], {
    encoding: 'utf8',
    timeout: 15_000,
  }).trim()
}
```

**If `sqlite3` is not installed:** `runSqlite()` throws. But `readClaudeTasks()` doesn't catch the error, and the API route catches with a generic 400. The symptom is an empty task board or error.

Detection (`detectClaudeKanban()`) checks for:
1. `~/.hermes/kanban.db` exists
2. `~/.hermes/kanban/` workspace directory exists
3. `claude` CLI on PATH (optional — only for metadata, doesn't affect `available`)

## dashboardProxyBackend

Probes `http://127.0.0.1:9119/api/plugins/kanban/board`. Requires `CLAUDE_DASHBOARD_TOKEN` or dashboard HTML-scrape token flow. Returns 401 without auth.

## API Details

### GET /api/swarm-kanban (new in v2.3.0)

The primary kanban endpoint for the Swarm/Kanban UI. Returns all cards (including done) plus backend detection metadata:

```json
{
  "ok": true,
  "cards": [ ... ],
  "backend": {
    "id": "claude",
    "label": "Hermes Kanban",
    "detected": true,
    "writable": true,
    "path": "/root/.hermes/kanban.db",
    "details": "Hermes Kanban storage detected (direct sqlite, /root/.hermes/kanban.db)"
  }
}
```

Also supports POST (create) and PATCH (update) with Zod-validated schemas. Cards use kanban-native statuses (backlog, ready, running, review, blocked, done) — no column mapping needed.

### GET /api/claude-tasks (legacy, unified)

Query params:
- `column` — filter by column (backlog, todo, in_progress, review, blocked, done)
- `assignee` — filter by assignee
- `priority` — filter by priority
- **`include_done=true`** — include done tasks (hidden by default!)

### Response Shape

```json
{
  "tasks": [
    {
      "id": "t_7c9547b8",
      "title": "Tombol hitung HPP...",
      "description": "...",
      "column": "done",
      "priority": "medium",
      "assignee": "backend-eng",
      "tags": [],
      "due_date": null,
      "position": 1778198507000,
      "created_by": "claude-kanban",
      "created_at": "2026-05-07T23:42:30.000Z",
      "updated_at": "2026-05-08T00:01:47.000Z"
    }
  ]
}
```

## Database Schema (hermes kanban.db)

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'backlog',
  assignee TEXT,
  priority INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'claude-kanban',
  created_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  last_heartbeat_at INTEGER,
  workspace_kind TEXT DEFAULT 'scratch',
  workspace_path TEXT
);
```

Status values: `backlog`, `ready`, `running`, `review`, `blocked`, `done`, plus custom user statuses.

## Kanban Dispatcher (Task Execution)

Tasks in `ready` status are automatically picked up and executed by the **dispatcher**, which is built into the Hermes gateway (not a separate process).

### Architecture

- **v2.3.0+**: The dispatcher runs **inside the gateway** (`hermes gateway`). Configure in `~/.hermes/config.yaml`:
  ```yaml
  kanban:
    dispatch_in_gateway: true          # default
    dispatch_interval_seconds: 60      # check every 60s
    failure_limit: 2                   # consecutive failures → auto-block
  ```
- **Standalone daemon is DEPRECATED**: Running `hermes kanban daemon` prints a warning and exits unless `--force` is passed. Running both the gateway's built-in dispatcher AND the standalone daemon causes race conditions on task claims.

### Task Lifecycle

```
create → triage → ready → (dispatcher claims) → running → done
                                                    ↓
                                               (fail 2x) → blocked
```

1. Task created with `hermes kanban create "title" --assignee <profile>`
2. Dispatcher picks up tasks in `ready` status with a valid assignee
3. Task moves to `running` — worker profile executes it in an isolated workspace
4. Completes → `done`; fails → retries; fails 2x consecutive → `blocked`

**Important**: Tasks without an assignee stay in `ready` forever. Always assign:

Also see: `references/frontend-probe-bug.md` for the "Failed to load tasks" frontend-probe bug that triggers when all tasks are done.
```bash
hermes kanban create "task" --assignee default
# or reassign later:
hermes kanban assign <task_id> default
```

### Checking Dispatcher Activity

```bash
# Task counts by status — running/done means dispatcher is working
hermes kanban stats

# Full execution log for a task
hermes kanban log <task_id>
```
