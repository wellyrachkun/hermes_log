# Finance Couple — Slow Loading Investigation (2026-05-07)

## Symptom
User reported: "di hp angka tidak load, tapi aku coba di PC angka bisa load setelah beberapa saat"
→ Numbers show Rp0 on mobile, eventually load after many seconds. PC also takes time but eventually loads.

## Root Cause Analysis

### 1. No loading state in hooks
`useTransactions()`, `useSummary()`, `useWallets()`, `useCategories()` all start with empty arrays/zeros and have no `isLoading` flag. Users see "Rp0", "0 transaksi", "Belum ada transaksi" while Supabase is still responding.

### 2. Supabase cold-start latency
First Supabase query from VPS: ~1.9s (connection/TLS handshake). Subsequent queries: ~0.2-0.25s. Mobile adds 0.5-2s network latency per call.

### 3. Redundant API calls from duplicate hook instances
Each `useTransactions()` call creates its own `useRefreshTick()` → own `db.getTransactions()` call. In `DashboardPage`:
- `useTransactions()` (direct, for recent transactions list)
- `useSummary()` → `useTransactionsByPeriod()` → `useTransactions()` (separate instance!)
- `useCategories()` (separate call)

This means 3+ independent Supabase queries for the same page load.

### 4. Period state resets on navigation
Navigating away from Dashboard and back resets the period filter. The page defaults to whatever period was last set in the parent component state.

## Data Flow (Supabase path)

```
App.tsx → login → initStorage()
  ├── checkSupabaseConnection() → users.select count (first call, ~2s)
  ├── initData() → checks users exist, seeds if empty
  └── useSupabase = true

DashboardPage mounts
  ├── useTransactions() #1 → db.getTransactions() → Supabase
  ├── useSummary() → useTransactionsByPeriod() → useTransactions() #2 → db.getTransactions() → Supabase
  ├── useCategories() → db.getCategories() → Supabase
  └── All show empty/zero until responses arrive (~3-5s total)
```

## Supabase Credentials (current as of 2026-05-07)

| User | Password |
|------|----------|
| suami | welly123 |
| istri | kasep9 |

Note: These differ from the defaults in the seed code (`suami123`/`istri123`). Credentials in Supabase DB can drift from code.

## Supabase Project
- URL: `https://osjzypropshuxvwpgkxi.supabase.co`
- Publishable key: `sb_publishable_-d93Eyxh21hBzBqlkYXapw_Kyje0Jwl`
- Direct REST debugging:
  ```bash
  curl -s 'https://osjzypropshuxvwpgkxi.supabase.co/rest/v1/users?select=*' \
    -H "apikey: sb_publishable_-d93Eyxh21hBzBqlkYXapw_Kyje0Jwl" \
    -H "Authorization: Bearer sb_publishable_-d93Eyxh21hBzBqlkYXapw_Kyje0Jwl"
  ```

## Deployment
- Domain: `fin.rachkun.dev`
- Nginx → `kamal-proxy` (127.0.0.1:9080) → app container on `kamal` Docker network
- Container: `xwellykun/financial_couple` (Kamal-deployed)
- Docker network: `kamal` (172.18.0.0/16)

## Note on env variable naming
`src/lib/supabase.ts` reads `VITE_SUPABASE_ANON_KEY`, but the project's `.env` uses `VITE_SUPABASE_PUBLISHABLE_KEY`. Verify the deployed `.env` matches what the built JS expects.

## Fix Applied (2026-05-07 session 2)

### Changes in `src/hooks/useStore.ts`

1. **Module-level shared cache** — `_cacheTxs`, `_cacheWallets`, `_cacheCats` prevent duplicate API calls across hook instances. Cache is invalidated (`null`) on any DB mutation via `subscribeToChanges`.

2. **Sequential loading in `ensureDbReady()`** — Changed from `Promise.all([getTransactions(), getWallets(), getCategories()])` to sequential `await` to avoid overwhelming Supabase free tier (3 concurrent queries trigger statement timeout).

3. **`{ data, loading, error }` return pattern** — All hooks now return error state. Errors are caught and propagated, not silently swallowed into empty arrays:
   ```ts
   export function useTransactions(): { data: Transaction[]; loading: boolean; error: string | null }
   export function useDbReady(): { ready: boolean; error: string | null }
   ```

4. **Error prevents retry loops** — When `_dbError` is set (from ensureDbReady failure), individual hook effects return early instead of retrying `db.getTransactions()`. This prevents cascading timeout errors from spamming the console.

### UI changes

- **DashboardPage** — Loading banner ("Memuat data... Mengambil data keuangan dari database") with amber spinner; error banner ("Gagal memuat data") with red icon + "Coba Lagi" button
- **SummaryCard** — Skeleton pulsing blocks during loading; error state with `AlertTriangle` icon
- **TransactionsPage** — Skeleton transaction rows during loading instead of "Tidak ada transaksi"

### Deployment

- Repo: `wellyrachkun/finance_couple` on GitHub
- Deployed via `kamal deploy` (commits must be pushed first — dist/ is committed)
- Container: `couple-finance-web-*` on `kamal` Docker network, served via `kamal-proxy` on 127.0.0.1:9080
- Nginx at `/etc/nginx/sites-enabled/fin.rachkun.dev` proxies to `http://127.0.0.1:9080`

### Remaining quirk: summary still shows Rp0

Even after the fix, the summary card sometimes shows Rp0 while the transaction list shows real data. This suggests a separate bug in the `useSummary` → `useTransactionsByPeriod` → `useTransactions` data pipeline (possibly stale closure or period mismatch). Not yet resolved.
