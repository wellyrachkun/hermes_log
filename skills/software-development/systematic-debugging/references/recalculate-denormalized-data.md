# Recalculate / Replay Pattern for Corrupted Denormalized Data

## When to Use
A bug caused a **denormalized column** (like `wallet.balance`) to drift from truth.
The source-of-truth records (e.g., `transactions`) are intact but the cached aggregate is wrong.

## Pattern (3-Step)

### 1. Fix the Delta Logic in All CRUD Operations
The bug is always in the **delta calculation** — the function that decides how much to add/subtract from the denormalized value on insert/update/delete.

Check every place that modifies the denormalized column:
- `addTransaction()` → delta applied on insert
- `updateTransaction()` → revert old delta + apply new delta
- `deleteTransaction()` → revert delta on delete

Common bug: introducing a new enum value (e.g., `"transfer"`) that the ternary/logic doesn't handle.
Fix pattern: expand the condition to check both `type` AND a discriminator field (`category`, `direction`, etc.).

### 2. Add a `recalculate*()` Function
Reset all denormalized values to zero, then replay all source-of-truth records in chronological order applying the **corrected** delta logic.

```typescript
async function recalculateWalletBalances() {
  // Reset all denormalized columns to 0
  for (const wallet of wallets) {
    wallet.balance = 0;
    // also reset nested denormalized fields (e.g., details[].balance)
  }

  // Replay all transactions in chronological order
  const txs = await getTransactions(); // ASC order
  for (const tx of txs) {
    const delta = computeCorrectDelta(tx); // uses the FIXED logic
    wallet.balance += delta;
  }

  // Persist corrected values
  for (const wallet of wallets) {
    await updateWallet(wallet.id, { balance: wallet.balance });
  }
}
```

Key points:
- Must replay in **chronological order** (ASC), not reverse
- Must use the **corrected** delta logic, not the old buggy one
- Must also fix nested denormalized fields (e.g., `details[].balance`)
- For SQL: do it in a transaction if possible. For client-side SQLite: just save once at the end.

### 3. Expose Via UI
Add a button (e.g., in Settings) so the user can trigger the recalculate manually.
- Show confirmation dialog explaining what it does
- Show loading state during recalculation
- Show result (number of items fixed) on success

## Real Example (Finance Couple)
- **Bug:** `addTransaction` delta was `type === "income" ? +amount : -amount`. When `"transfer"` type was added, transfer-IN transactions got `-amount` instead of `+amount`.
- **Fix:** Changed condition to `type === "income" || (type === "transfer" && category === "transfer masuk") ? +amount : -amount` in 6 locations across 2 files.
- **Recalc:** `recalculateWalletBalances()` resets all wallet balances to 0, replays all transactions ASC, saves corrected balances.
- **UI:** "Hitung Ulang Saldo" button in Settings > Pengaturan page.

## Pitfalls
- **Don't forget `updateTransaction` and `deleteTransaction`** — they also apply/revert deltas. Fix all three operations in one pass.
- **Chronological replay order matters** — replaying in DESC gives wrong intermediate balances (though the final result is the same for additive deltas).
- **Nested denormalized fields** — if `wallet.details[i].balance` is also denormalized, recalculate those too.
- **Don't use the old buggy delta in the recalculate function** — copy the corrected logic, don't call the just-fixed `addTransaction` which would double-apply.
