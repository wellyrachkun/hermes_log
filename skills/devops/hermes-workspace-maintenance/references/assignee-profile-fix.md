# Assignee Profile Fix — "default" Not Showing in Workspace Kanban

## Problem

After adding the `default` profile as a kanban assignee, the Workspace Kanban UI's
assignee dropdown doesn't show "default". Only profiles in `~/.hermes/profiles/`
subdirectories (e.g., `backend-eng`) appear.

## Root Cause

`src/routes/api/claude-tasks-assignees.ts` line 42-58 — `getProfileNames()` only scans
`~/.hermes/profiles/` for directories containing `config.yaml`:

```typescript
function getProfileNames(): string[] {
  try {
    return fs.readdirSync(PROFILES_PATH).filter(name => {
      try {
        const profilePath = path.join(PROFILES_PATH, name)
        return (
          fs.statSync(profilePath).isDirectory() &&
          fs.existsSync(path.join(profilePath, 'config.yaml'))
        )
      } catch {
        return false
      }
    })
  } catch {
    return []
  }
}
```

The `default` profile is the primary profile — its config lives at `~/.hermes/config.yaml`
directly, NOT in a `~/.hermes/profiles/default/` subdirectory.

## Fix

Patch `src/routes/api/claude-tasks-assignees.ts` to always include "default" after the
profile scan:

```typescript
// After the for (const id of profiles) loop (~line 147):
// Always include "default" — the primary profile lives at ~/.hermes/,
// not in the profiles/ subdirectory, so it won't be picked up by
// getProfileNames() but is always a valid kanban assignee.
if (!merged.has('default')) {
  merged.set('default', { id: 'default', label: 'Default', isHuman: false })
}
```

The Vite dev server auto-reloads via HMR — no restart needed. The change takes effect
on the next page refresh.

## Verification

```bash
# Check that assignees API includes default
curl -s http://127.0.0.1:3333/api/claude-tasks-assignees \
  -H "Cookie: claude-auth=<your-session-token>"
```

Should include `{"id":"default","label":"Default","isHuman":false}` in the response.
