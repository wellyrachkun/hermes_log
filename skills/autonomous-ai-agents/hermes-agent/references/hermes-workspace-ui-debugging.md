# Hermes Workspace UI Debugging Notes

Use this when the separate `~/hermes-workspace` web app fails in browser/dev server, especially React runtime errors during onboarding or shell render.

## Known issue: `HermesOnboarding is not defined`

Symptom:
- Browser console/runtime error says `HermesOnboarding is not defined`.
- Dev server may still run normally on port 3000.

Cause found in `~/hermes-workspace/src/routes/__root.tsx`:
- The route rendered `<HermesOnboarding />`.
- The imported component was actually `ClaudeOnboarding` from `@/components/onboarding/claude-onboarding`.

Fix:
```tsx
{mounted && rootSurfaceState.showOnboarding ? <ClaudeOnboarding /> : null}
```

Verification steps:
```bash
cd ~/hermes-workspace
pnpm build
pnpm exec vitest run src/routes/-root-layout-state.test.ts src/routes/-root-layout-utils.test.ts --reporter=dot
```

Then open:
```text
http://127.0.0.1:3000
```
Check browser console; the `HermesOnboarding is not defined` error should be gone.

## Known issue: `assistantCorruptionWarning is not defined`

Symptom:
- Browser console/runtime error says `ReferenceError: assistantCorruptionWarning is not defined`.
- Stack points to `src/screens/chat/components/message-item.tsx` around the assistant message render branch.

Cause found in `~/hermes-workspace/src/screens/chat/components/message-item.tsx`:
- JSX rendered `{assistantCorruptionWarning ? ...}` but the component never defined the variable.
- The helper `detectAssistantCorruptionWarning(role, text)` already existed, but was not called from `MessageItemComponent`.

Fix:
```tsx
const assistantDisplayText = effectiveIsStreaming ? revealedText : displayText
const assistantCorruptionWarning = useMemo(
  () => detectAssistantCorruptionWarning(role, assistantDisplayText),
  [role, assistantDisplayText],
)
```

Verification steps:
```bash
cd ~/hermes-workspace
pnpm build
pnpm exec vitest run src/screens/chat/components/message-item.test.ts --reporter=dot
```

Then open the chat/session that previously crashed and check browser console; the ReferenceError should be gone.

## Testing pitfall

`pnpm test -- <files>` in this repo may still run many unrelated tests because of the package script/Vitest behavior. Prefer direct Vitest invocation for targeted checks:

```bash
pnpm exec vitest run <test-file-1> <test-file-2> --reporter=dot
```

If unrelated tests fail, report them separately and do not conflate them with the focused fix.
