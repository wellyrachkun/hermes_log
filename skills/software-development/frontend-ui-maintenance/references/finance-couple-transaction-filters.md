# Couple Finance: Transaction History Filters

Session pattern for adding filters to the Vite/React Couple Finance app.

## Context

- Repo: `~/projects/freelance/finance_couple`
- UI language: Indonesian.
- App is client-side only; navigation is view-state driven.
- `dist/` is committed, so `npm run build` updates hashed assets and `dist/index.html`.

## Implemented pattern

For transaction history filters in `src/pages/TransactionsPage.tsx`:

1. Import wallet data with `useWallets()` from `src/hooks/useStore.ts`.
2. Keep filter state local to the page:
   - `walletId` defaulting to `"all"`
   - text filter for `description`/keterangan
3. Compose filters inside the existing `useMemo` over `useTransactionsByPeriod(period)`:
   - preserve existing period and income/expense filter behavior
   - if `walletId !== "all"`, match `t.walletId === walletId`
   - if description filter is non-empty, match `t.description.toLowerCase().includes(descriptionFilter.toLowerCase())`
4. Add a wallet `<select>` with Indonesian option labels such as `Semua dompet` and wallet names from `wallets.map(...)`.
5. Keep mobile layout simple: stacked rounded filter controls inside the existing `space-y-3` container.

## Cross-page wallet history shortcut

When adding a shortcut from `src/pages/WalletsPage.tsx` to a filtered transaction history:

1. Lift the selected wallet filter into `src/App.tsx` as shared view-state, e.g. `transactionWalletId` defaulting to `"all"`.
2. Pass it into `TransactionsPage` as an optional `initialWalletId` prop and initialize local filter state from that value.
3. Add an `onViewHistory(walletId)` prop to `WalletsPage`; from each `WalletCard`, call it with that wallet's `id`, then switch `view` to `"transactions"`.
4. Add an optional action prop to `WalletCard` (e.g. `onViewHistory`) and render a small `History` icon button with `title="Lihat riwayat"` alongside edit/delete.
5. Reset the lifted wallet id to `"all"` when navigating to `"transactions"` from normal app navigation, so the bottom-nav/menu path does not stay stuck on the last wallet-specific shortcut.

This app has no React Router, so do not use query params/routes for this behavior unless routing is introduced later.

## Verification

Run:

```bash
npm run build
```

Expected: TypeScript + Vite build succeeds. Vite may warn about chunks >500 kB; this is non-blocking for this feature.

## Pitfalls

- Do not remove or bypass existing period/type filters; new filters should compose with them.
- Use existing transaction fields (`walletId`, `description`) rather than adding schema changes.
- Avoid unused imports/state because `noUnusedLocals` fails the TypeScript build.
- Mention generated `dist/` asset hash churn in the final summary if build was run.
