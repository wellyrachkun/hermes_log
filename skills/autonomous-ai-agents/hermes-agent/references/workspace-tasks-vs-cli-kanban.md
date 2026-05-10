# Workspace Tasks vs CLI Kanban — Two Separate Systems

Hermes has **two independent task/kanban systems**. They do NOT share data and serve different purposes.

## 1. Hermes Workspace Tasks (web UI)

- **Access**: Hermes Workspace web app (port 3333 by default) → sidebar "Tasks"
- **Data store**: Internal to the Workspace Vite/React app (likely IndexedDB or API-backed, separate from `~/.hermes/kanban.db`)
- **Columns**: Backlog → Todo → In Progress → Review
- **Capabilities**: Drag & drop, assignee, due date, tags, simple Kanban
- **Use case**: Manual task tracking, personal kanban board you interact with via browser
- **CLI command**: N/A — no CLI, web-only

## 2. Hermes Kanban CLI (`hermes kanban`)

- **Access**: `hermes kanban list`, `hermes kanban create`, `hermes kanban show`, etc.
- **Data store**: `~/.hermes/kanban.db` (SQLite)
- **Features**: Task dependencies (`parents=[...]`), atomic claiming, auto-dispatch to specialist profiles, workspace isolation (scratch/dir/worktree), retry/reclaim, heartbeats, event streaming
- **Use case**: Automated multi-agent workflow orchestration, dispatched to specialist profiles
- **CLI command**: Full CLI suite — see `hermes kanban --help`

## Key difference

| | Workspace Tasks | CLI Kanban |
|---|---|---|
| Auto-dispatch to agents | ❌ | ✅ |
| Task dependencies | ❌ | ✅ |
| Workspace isolation | ❌ | ✅ |
| Web UI | ✅ | ❌ (CLI only) |
| Gateway-accessible | Via Workspace web app | Via `hermes kanban` in terminal |

## Pitfall

**`hermes kanban list` returns empty ≠ no tasks exist.** The user may have added tasks to the Workspace Tasks board, which is a completely separate system. Always check both:

```bash
# Check CLI kanban
hermes kanban list

# Check Workspace Tasks (via browser or DOM query on port 3333)
curl -s http://127.0.0.1:3333/ | ... # or use browser tool to query DOM
```

When the user says "task board", clarify which one they mean — Workspace Tasks or CLI Kanban.
