# Couple Finance mobile modal fix

Session context: user reported the **Rincian Dana Exclude Laporan** modal in `/root/projects/freelance/finance_couple` could not show the bottom data on mobile, likely covered by bottom menu.

## Project facts

- Path: `/root/projects/freelance/finance_couple`
- Stack: Vite + React + TypeScript + Tailwind v4
- Branch seen: `main`
- `dist/` is committed according to project docs; `npm run build` legitimately changes hashed assets.

## Diagnosis

- Modal found in `src/pages/DashboardPage.tsx` from strings like `Rincian Dana Exclude` / `Dana Exclude Laporan`.
- Bottom navigation found in `src/components/BottomNav.tsx` with `fixed bottom-0 ... z-50`.
- Modal wrapper also used `z-50`, creating a stacking conflict with the bottom nav.
- Modal panel used `max-h-[75vh] overflow-y-auto`, but lacked mobile dynamic viewport height, overscroll containment, and safe-area bottom padding.

## Fix applied

```diff
- <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" ...>
-   <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[75vh] overflow-y-auto" ...>
+ <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" ...>
+   <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[calc(100dvh-5rem)] sm:max-h-[75vh] overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]" ...>
```

## Verification

Command:

```bash
cd /root/projects/freelance/finance_couple
npm run build
```

Result: success. Vite emitted a non-blocking large chunk warning. Build changed `dist/index.html`, deleted old hashed CSS/JS assets, and created new hashed CSS/JS assets.

## Reusable lesson

For mobile bottom-sheet modals above fixed bottom navigation:

1. Make overlay z-index clearly higher than the nav.
2. Use dynamic viewport max height (`100dvh`) plus `overflow-y-auto`.
3. Add `overscroll-contain` for better modal scrolling.
4. Add bottom safe-area padding so final rows/buttons are visible.
5. If the project commits `dist/`, include generated asset churn in status/commit summaries.
