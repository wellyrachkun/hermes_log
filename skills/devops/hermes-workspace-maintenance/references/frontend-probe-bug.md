# Frontend Tasks Probe Bug — "Failed to load tasks" on Show Done

## Problem

The Workspace tasks screen shows "Failed to load tasks" (with Retry buttons in each column) when the user clicks "Show Done", even though the API (`/api/claude-tasks?include_done=true`) returns valid data.

## Root Cause

`src/lib/tasks-api.ts` has a **backend-resolution probe** that runs on first load. It probes both `/api/hermes-tasks` and `/api/claude-tasks` to decide which backend to use:

```typescript
async function probeBackend(base: string): Promise<number> {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(3000) })
    // ...
  }
}
```

The probe calls `GET /api/claude-tasks` **without `include_done=true`**. When all kanban tasks are in `done` status, the endpoint returns `{"tasks":[]}` (done tasks are filtered out by default). The probe returns `count=0`.

Both backends return `count=0`, so the fallback logic (`hermesCount >= claudeCount`) resolves to **`hermes`** (the canonical agent store). But `/api/hermes-tasks` **doesn't exist as an API route** in the workspace — it returns the SPA HTML shell page (200 OK with `<html>...</html>`).

Subsequent `fetchTasks()` calls go to `/api/hermes-tasks`, receive HTML instead of JSON, parse fails → "Failed to load tasks".

## Fix

Patch the probe to use `include_done=true` so it counts all tasks:

```typescript
// src/lib/tasks-api.ts ~line 32
async function probeBackend(base: string): Promise<number> {
  try {
-   const res = await fetch(base, { signal: AbortSignal.timeout(3000) })
+   const res = await fetch(`${base}?include_done=true`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return 0
    const data = await res.json()
    return Array.isArray(data.tasks) ? data.tasks.length : 0
  } catch {
    return 0
  }
}
```

Now `/api/claude-tasks?include_done=true` returns all 4 tasks → `claudeCount=4`, while `/api/hermes-tasks?include_done=true` still returns HTML (no such route) → parse error → `hermesCount=0`. Resolution correctly picks `claude` backend.

Vite HMR auto-reloads — no restart needed. Refresh the browser.

## Detection

If you suspect this bug, check the browser console:

```javascript
// The probe runs once and caches the result.
// Check which backend was resolved:
fetch('/api/claude-tasks?include_done=true').then(r => r.json()).then(d => console.log('claude:', d.tasks.length))
```

If the direct API call returns data but the UI shows "Failed to load tasks", the probe resolved to the wrong backend (hermes, which doesn't exist).
