# PostgreSQL REAL Precision Pitfall — Full Diagnosis

**Date:** 2026-05-06  
**Project:** finance_couple (Couple Finance)  
**Supabase URL:** osjzypropshuxvwpgkxi.supabase.co

## Symptom

User edits wallet balance to `22.731.625` (IDR format, actual value 22,731,625), saves, but the stored value is `22.731.600` (22,731,600). Difference: exactly 25.

The user could repeatedly edit, and the value would always come back as 22,731,600.

## Investigation Path

1. **First suspect: HTML `<input type="number">` rounding.** The wallet edit form used `<input type="number">`. Changed to `<input type="text" inputMode="numeric">` with `numericOnly` filter (consistent with AddTransactionPage and TransferPage in the same project). Deployed — still broken.

2. **Checked Supabase API directly.** Queried wallets via REST API:
   ```bash
   curl https://osjzypropshuxvwpgkxi.supabase.co/rest/v1/wallets?select=id,name,balance
   ```
   Response showed: `"balance": 22731600.0` — float-formatted JSON, confirming the value was stored as float, not integer.

3. **Checked migration.sql schema.** Found:
   ```sql
   balance REAL NOT NULL DEFAULT 0,
   amount REAL NOT NULL,
   ```

## Root Cause

PostgreSQL `REAL` = IEEE 754 single-precision (float4):
- Mantissa: 23 bits explicit + 1 implicit = 24 bits
- Exact integer range: up to 2^24 = 16,777,216
- Beyond 16,777,216: precision degrades in increments of 2, then 4, 8, etc.
- 22,731,625 > 16,777,216 → rounded to nearest representable float4 value

## Fix

### Immediate (in production)
Run in Supabase SQL Editor:
```sql
ALTER TABLE wallets ALTER COLUMN balance TYPE BIGINT USING balance::BIGINT;
ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT USING amount::BIGINT;
```

### Permanent (in schema)
Updated `supabase/migration.sql`:
```sql
balance BIGINT NOT NULL DEFAULT 0,
amount BIGINT NOT NULL,
```

## Key Takeaway

Never use `REAL`/`FLOAT` for financial amounts. Use `BIGINT` for integer-denominated currency or `NUMERIC(precision, scale)` for decimal amounts. The silent precision loss at >16M is a data corruption bug that's hard to spot because small test data works fine.
