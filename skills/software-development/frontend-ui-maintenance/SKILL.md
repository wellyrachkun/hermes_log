---
name: frontend-ui-maintenance
description: "Use when implementing, debugging, or verifying frontend UI fixes in React/Vite/Tailwind apps, especially responsive/mobile layout, overlays, modals, and committed build artifacts."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [frontend, react, vite, tailwind, responsive, ui, mobile]
    related_skills: [systematic-debugging, requesting-code-review, test-driven-development]
---

# Frontend UI Maintenance

## Overview

Use this skill for practical frontend fixes: React component changes, Tailwind class adjustments, responsive/mobile layout bugs, modal/overlay stacking, scroll containment, safe-area issues, and production build verification for Vite-style apps.

The goal is to make the smallest correct UI change, verify it with the project’s own build/test path, and report only the useful outcome to the user.

## When to Use

- A user asks for a UI bug fix or visual/layout adjustment.
- Mobile content is hidden behind fixed headers, footers, or bottom navigation.
- A modal, drawer, popover, or overlay has z-index/scroll/viewport issues.
- A Vite/React/TypeScript/Tailwind app needs a change verified with build output.
- View-state navigation in a client-side React app needs a cross-page shortcut or prefilled filter state.
- A repo commits generated frontend assets such as `dist/` and those assets must be kept in sync.

Don't use this as the main skill for backend API behavior, Rails-only changes, or deployment orchestration unless the frontend build is the relevant part.

## Workflow

1. **Locate the UI surface**
   - Search for the visible Indonesian/English label, component name, route, state variable, or modal title.
   - Search nearby for fixed-position elements (`fixed`, `bottom-`, `top-`, `z-`, `overflow`, `max-h`, `h-screen`, `dvh`).

2. **Check current repo state first**
   - Run `git status --short --branch` before edits.
   - Note whether the branch is clean and whether generated assets are tracked.

3. **Fix the root layout issue, not just the symptom**
   - For content hidden by a fixed bottom nav: ensure the overlay is above the nav, the panel can scroll, and there is bottom padding/safe-area.
   - Prefer localized class changes when the bug is isolated to one component.

4. **Verify with the project’s own command**
   - Check `package.json` for scripts.
   - In TypeScript/Vite projects, run `npm run build` unless the repo documents another verification path.
   - Treat chunk-size warnings as non-blocking unless the user asked for bundle optimization.

5. **Inspect diff before reporting**
   - Use `git diff -- <changed-source-file>` for source changes.
   - Use `git status --short` and `git diff --stat` to identify generated asset churn.
   - If `dist/` or another build directory is intentionally tracked, include it in the summary and commit if the user asks.

## Mobile Modal / Bottom Navigation Pattern

When a bottom sheet or mobile modal content cannot show the bottom rows because a fixed bottom nav overlaps it:

- Give the modal/overlay a z-index higher than the nav. If bottom nav is `z-50`, use something like `z-[70]` for the overlay.
- Ensure the modal panel has a viewport-bound max height and can scroll: `max-h-[calc(100dvh-5rem)] overflow-y-auto`.
- Keep desktop/tablet behavior stable with breakpoint-specific limits, e.g. `sm:max-h-[75vh]`.
- Add `overscroll-contain` to reduce scroll bleed into the page behind the modal.
- Add bottom padding with safe area support: `pb-[calc(1rem+env(safe-area-inset-bottom))]`.
- Prefer `100dvh` over `100vh` for modern mobile browser chrome behavior.

Example Tailwind adjustment:

```tsx
<div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
  <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[calc(100dvh-5rem)] sm:max-h-[75vh] overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]">
    {/* modal content */}
  </div>
</div>
```

## Finance Couple UI Patterns

For `~/projects/freelance/finance_couple`, small UI feature requests often touch view-state navigation plus committed Vite assets:

- **Wallet shortcut to filtered history:** keep selected wallet state in `App.tsx`, pass it as `initialWalletId` to `TransactionsPage`, and reset it to `"all"` when navigating to transactions from the normal bottom nav. Add the action button in `WalletCard` and thread callbacks through `WalletsPage` rather than adding a router.
- **History filters:** use `useWallets()` in `TransactionsPage` for a wallet `<select>` and combine filters in one `useMemo`: period txs + transaction type + `walletId` + description substring.
- **Wallet card action layout:** keep balance in a right-side `shrink-0 flex flex-col items-end` column, with action buttons directly below it. Use `items-start` on the card and keep wallet name/badges in the left flexible column to avoid overlap on mobile.
- **Pie chart crowded labels:** in Recharts pie charts on mobile, hide labels for small slices (e.g. `< 8%`) and show the complete category list in a separate detail section. Disable `labelLine` and use chart margins/outer radius conservatively to avoid label collisions.

## Committed Build Artifacts

Some Vite frontend repos commit `dist/`. In those projects:

- Build verification may delete old hashed assets and create new hashed assets.
- `dist/index.html` usually changes to point at the new asset filenames.
- Do not assume this is accidental; check README/project docs or previous repo convention.
- Mention the generated asset churn in the final summary so the user understands why many files changed.

## User Communication

For this user, keep the final report concise and practical:

- Say what was fixed.
- List the key file(s).
- State the verification command and result.
- Mention generated `dist/` changes only if relevant.
- Ask whether to commit/push only when the user has not already requested it.

## Stimulus UI State Persistence (Rails + daisyUI/Tailwind)

For Rails apps using Stimulus controllers + daisyUI/Tailwind, persist desktop UI state (collapsed sidebar, toggle prefs) across page reloads.

### Preferred: Cookie + Server-Side Render (zero flash)

The user prefers the DOM to **never contain the wrong state** — no "open first then close" moment. Use cookies so Rails can render the correct class in the HTML from the start:

1. **Stimulus controller**: on toggle, set a cookie (`path=/`, `max-age=1 year`, `SameSite=Lax`) AND localStorage (backup).
2. **Rails layout**: read `cookies["key"]` server-side, inject `is-collapsed`/`is-sidebar-collapsed` classes directly in ERB.
3. **Inline `<script>`**: only for theme (which can't be server-rendered). Sidebar sidebar never appears in the inline script.

```erb
<% sidebar_collapsed = cookies["joyphone-sidebar-collapsed"] == "1" %>
<aside class="jp-sidebar ... transition-[width] duration-300<%= " is-collapsed" if sidebar_collapsed %>">
```

```js
// Stimulus controller _saveState:
document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${365*24*60*60}; SameSite=Lax`
localStorage.setItem(STORAGE_KEY, value)  // backup
```

Result: HTML arrives with correct classes → no transition glitch → no inline script needed for sidebar.

### Fallback: localStorage + Inline Script + no-transition

When cookies aren't feasible (e.g. JS-only SPA, no server access), use the dual-layer approach with transition suppression:

1. **CSS rule**: `.no-transition *, .no-transition *::before, .no-transition *::after { transition: none !important; animation: none !important; }`
2. **Inline script**: add `no-transition` to `<html>`, read localStorage, apply classes, then `requestAnimationFrame` × 2 to remove `no-transition`.
3. **Stimulus controller**: `connect()` restores, `toggle()` saves.

This prevents visible animation but the DOM still briefly contains the wrong state before the inline script runs.

See `references/rails-stimulus-localstorage-persistence.md` for full code examples of both patterns.

## References

- `references/rails-stimulus-localstorage-persistence.md` — Stimulus + inline script dual-layer localStorage persistence with zero-flash UI state restore.
- `references/finance-couple-mobile-modal.md` — concrete example from the Couple Finance project: Tailwind modal z-index/scroll/safe-area fix with committed Vite `dist/` output.
- `references/finance-couple-transaction-filters.md` — Couple Finance pattern for adding transaction history filters that compose period/type/wallet/description filters and verifying committed Vite `dist/` output.
- `references/finance-couple-slow-loading.md` — Investigation of slow data loading on mobile: Supabase latency, missing loading states, redundant hook API calls, and credentials drift.
- `references/web-performance-image-audit.md` — Systematic image-weight audit: browser_get_images → HEAD → console timing → structural anti-patterns checklist.

## Number Input Pattern (avoid `<input type="number">`)

HTML `<input type="number">` silently corrupts large integers in some browsers/locales — rounding, truncating, or misinterpreting values. The safe pattern used throughout finance_couple:

```tsx
const numericOnly = (v: string) => v.replace(/\D/g, "");
// ...
<input type="text" inputMode="numeric" value={value} onChange={e => setValue(numericOnly(e.target.value))} placeholder="0" />
```

`inputMode="numeric"` shows the numeric keypad on mobile while keeping the value as a raw string — no browser-side number parsing, no rounding, no locale issues. `numericOnly` strips any non-digit characters. Parse to integer only at submit time with `parseInt(value || "0", 10)`.

When adding a new numeric input or encountering balance/amount precision bugs, always check whether the input is `type="number"` — replace with the pattern above.

## Common Pitfalls

1. **Using `<input type="number">` for currency/balance.** HTML number inputs parse values through JS floats (IEEE 754) and may round, truncate, or reject formatted input depending on browser locale. Always use `type="text" inputMode="numeric"` + `numericOnly` filter for integer amounts in finance/currency apps.

2. **Overlay and nav using the same z-index.** Equal z-index values can let DOM order or stacking contexts decide unexpectedly. Make the overlay clearly higher.

3. **Only increasing height without scroll.** A taller modal still fails if content overflows with no `overflow-y-auto`.

4. **Ignoring mobile browser chrome.** `100vh` can behave poorly on mobile. Prefer `100dvh` when available.

5. **Forgetting safe-area padding.** iOS and some Android devices need extra bottom padding for comfortable access to the final rows/buttons.

6. **Treating generated asset diffs as bugs.** In repos that commit `dist/`, hashed asset replacement after build is expected.

7. **Over-explaining to the user.** The user prefers direct Indonesian summaries with results, not long implementation essays.

8. **Letting shortcut state leak into normal navigation.** For view-state-only apps, reset lifted filter/default state when the user navigates through the normal menu, while preserving it for explicit shortcuts (e.g. wallet → transaction history).

9. **Showing zeros/empty while API call is in flight.** When a Supabase-backed hook returns `[]` as initial state with no `isLoading` flag, users see "Rp0" / "Belum ada transaksi" for 3–5 seconds. Always return `{ data, loading, error }` from async hooks and show skeleton/spinner while `loading === true`.

10. **Silently swallowing API errors into empty arrays.** `catch { return [] }` in a data hook makes Supabase timeouts look like "no data yet" instead of errors. Log the error AND propagate it via an `error` return field so the UI can show a retry button.

11. **Firing parallel queries on Supabase free tier.** `Promise.all([getTransactions(), getWallets(), getCategories()])` fires 3 concurrent queries — the free tier's ~2s statement timeout kills them. Load sequentially with `await`.

12. **Trusting `browser_snapshot` (compact mode) for text content.** The compact browser snapshot occasionally omits paragraph text. When numbers seem wrong, verify with `browser_console`: `Array.from(document.querySelectorAll('p')).map(p => p.textContent).filter(Boolean)`.

13. **Not checking `browser_console` for API errors.** When the UI shows zeros but you expect data, check the console for `[Supabase] getTransactions error:` lines. These errors are often `console.error`'d but silently swallowed by the data layer.

14. **Serving full-resolution images for thumbnail displays.** A logo at 4566px wide displayed at 150px wastes 30× bandwidth. Social icons at 900px rendered at 20px. Always check `browser_get_images` intrinsic `width`/`height` against CSS display size. HEAD-request the `Content-Length` to quantify the damage. See `references/web-performance-image-audit.md` for the full audit workflow.

16. **Commit+push without redeploying Kamal app.** For repos that deploy via Kamal (e.g. finance_couple), commit+push ≠ live. After `git push`, run `kamal deploy` then verify the feature string exists in the served JS bundle: `ASSET=$(curl -sS https://<domain>/ | grep -oP 'assets/index-[^"]+\.js') && curl -sS "https://<domain>/$ASSET" | grep -o 'FeatureString'`. A healthy 200 on the domain is not enough — the container may still be running an old commit. Use the Deployment Freshness Audit from the `kamal-deployment` skill to confirm the running image tag matches HEAD.

17. **Assuming a feature is live because build passed.** `npm run build` passing only proves the code compiles. If the app is Kamal-deployed with committed `dist/`, the sequence is: edit → build → `git add` source+dist → commit → push → `kamal deploy` → verify production JS.

## React Data-Loading States (Supabase / API-Backed Hooks)

When a React/Vite app fetches data from Supabase or any async backend, **always** differentiate between "still loading" and "empty data". Without a loading state, users see zeros/empty while the first API call is in flight — especially painful on mobile where the first Supabase call can take 2–4 seconds.

### Pattern: `isLoading` flag in hooks

```tsx
export function useTransactions(): { data: Transaction[]; isLoading: boolean } {
  const tick = useRefreshTick();
  const [data, setData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let m = true;
    setIsLoading(true);
    db.getTransactions().then(r => { if (m) { setData(r); setIsLoading(false); } });
    return () => { m = false; };
  }, [tick]);
  return { data, isLoading };
}
```

### Pattern: Skeleton/spinner in the component

```tsx
const { data: allTx, isLoading } = useTransactions();
if (isLoading) return <SkeletonSummary />;  // or inline spinner
if (allTx.length === 0) return <EmptyState />;
return <TransactionList transactions={allTx} />;
```

### Supabase latency profile (from VPS, Singapore region)

| Call | Cold | Warm |
|------|------|------|
| First query (connection handshake) | ~1.9s | — |
| Subsequent queries | — | ~0.2–0.25s |

Mobile adds 0.5–2s per call. Plan for 3–5s before first render.

### Pitfall: Duplicate hook instances = duplicate API calls

Each `useTransactions()` call inside a component tree creates its **own** `useRefreshTick()` listener and makes its **own** `db.getTransactions()` call. If `DashboardPage` calls `useTransactions()` directly AND `useSummary()` calls `useTransactionsByPeriod()` which calls `useTransactions()` again, that's two independent Supabase queries for the same data.

**Fix:** Lift the data-fetching hook to a shared parent or use a simple context/store so all consumers read from one source:

```tsx
// In parent:
const txData = useTransactions();

// Pass down or useContext — don't call useTransactions() again in children
<SummaryCard transactions={txData.data} isLoading={txData.isLoading} />
<RecentTransactions transactions={txData.data} isLoading={txData.isLoading} />
```

### Pattern: Module-level shared cache (no context needed)

For apps where many components need the same data but adding Context/Provider is heavy, use a module-level cache with a change-notification tick:

```tsx
// Shared module-level cache — all hook instances read from the same source
let _cacheTxs: Transaction[] | null = null;
let _dbReady = false;

let _tick = 0;
const _listeners = new Set<(n: number) => void>();
function notify() { _tick++; _listeners.forEach(cb => cb(_tick)); }

export function useTransactions(): { data: Transaction[]; loading: boolean } {
  const tick = useRefreshTick(); // listens to _tick
  const [data, setData] = useState<Transaction[]>(_cacheTxs || []);
  const loading = !_cacheTxs && !_dbReady;
  useEffect(() => {
    if (_cacheTxs) { setData(_cacheTxs); return; }
    db.getTransactions().then(r => { _cacheTxs = r; setData(r); });
  }, [tick]);
  return { data, loading };
}

// Invalidate cache on any mutation:
function onDbChange() {
  _cacheTxs = null; _cacheWallets = null; _cacheCats = null;
  notify();
}
```

When a mutation is detected (via Supabase realtime or local events), null the cache so the next render re-fetches. This avoids the duplicate-call problem without a context wrapper.

### Supabase free-tier: statement timeout (error 57014)

Supabase free tier enforces a **statement timeout** (~2s). Under load or with many concurrent queries, `getTransactions()` may return:

```
[Supabase] getTransactions error: {code: "57014", message: "canceling statement due to statement timeout"}
```

**Mitigations:**
1. **Load data sequentially, not in parallel.** `Promise.all([getTransactions(), getWallets(), getCategories()])` fires 3 queries at once → 3× timeout risk. Use `await` one-by-one instead.
2. **Preload cache at module import time.** Start `ensureDbReady()` when the JS bundle first loads, so data fetching overlaps with user login/UI render.
3. **Add error state to hooks** (`{ data, loading, error }`) and show a red error banner with a retry button when timeouts occur.
4. **Never silently swallow errors into empty arrays.** The old `catch { return [] }` pattern made timeouts look like "no data yet". Log the error and propagate it so the UI can show a retry.

### Pattern: Error banner with retry

```tsx
const { data: summary, loading, error } = useSummary(period);

{error && !loading && (
  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
    <AlertTriangle className="text-red-500" />
    <p className="text-sm font-semibold text-red-800">Gagal memuat data</p>
    <p className="text-xs text-red-600">{error}</p>
    <button onClick={() => window.location.reload()}
      className="w-full py-2 bg-red-100 text-red-700 rounded-lg">
      Coba Lagi
    </button>
  </div>
)}
```

### Debugging: browser snapshot vs real DOM

The `browser_snapshot` tool (especially in compact mode) may omit text content from paragraphs. When in doubt, verify with:

```js
// browser_console expression:
Array.from(document.querySelectorAll('p')).map(p => p.textContent).filter(Boolean)
```

### Debugging: always check browser console for swallowed errors

When the UI shows zeros/empty but you expect data, check `browser_console` for errors. Supabase errors are often `console.error`'d but the UI shows empty arrays as "no data". Look for `[Supabase] getTransactions error:` lines.

See `references/finance-couple-slow-loading.md` for the full investigation transcript.

## Verification Checklist

- [ ] Relevant component/file found from UI text or route.
- [ ] Fixed-position blockers and z-index values checked.
- [ ] Mobile panel has bounded height, scroll, and bottom padding/safe-area if needed.
- [ ] **Data-loading hooks have an `isLoading` flag and UI shows skeleton/spinner during fetch.**
- [ ] **No duplicate `useTransactions()` (or similar) calls in the same render tree — lift state up or use context.**
- [ ] TypeScript/Vite build or project-specific verification succeeds.
- [ ] Diff/status reviewed, including generated assets if tracked.
- [ ] **If Kamal-deployed: `kamal deploy` → verify feature string in production JS bundle.** (Pitfall #16)
- [ ] Final response is concise and states files changed + verification result.
