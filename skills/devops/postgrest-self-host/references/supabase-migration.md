# Supabase-to-PostgREST Data Migration

Python script to migrate all tables from Supabase cloud to local PostgreSQL + PostgREST.

## Prerequisites
- PostgREST running on `http://127.0.0.1:3334`
- Supabase URL and anon key

## Migration Script

```python
import urllib.request, json

SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "sb_publishable_xxx"
PG_URL = "http://127.0.0.1:3334"

def supabase_fetch(table):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{table}?select=*",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    return json.loads(urllib.request.urlopen(req).read())

def pg_insert(table, rows):
    for row in rows:
        data = json.dumps(row).encode()
        req = urllib.request.Request(
            f"{PG_URL}/{table}",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            method="POST"
        )
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            print(f"  Failed {table}: {e}")

def pg_count(table):
    req = urllib.request.Request(f"{PG_URL}/{table}?select=count")
    return json.loads(urllib.request.urlopen(req).read())[0]["count"]

# Migrate in dependency order
for table in ["users", "wallets", "categories", "transactions", "audit_logs"]:
    rows = supabase_fetch(table)
    print(f"Migrating {table}: fetched {len(rows)} rows")
    pg_insert(table, rows)
    print(f"  Local count: {pg_count(table)}")
```

## Key Pitfalls

### Why Python urllib instead of shell curl?
Shell `curl` with `-d '...'` breaks when JSON contains:
- Single quotes in strings
- Newlines or control characters (attachment data URLs)
- Backslash escaping issues

Python's `urllib` handles JSON encoding natively — no quoting issues.

### Insert Order Matters
Insert in dependency order: users → wallets → categories → transactions → audit_logs. PostgREST doesn't enforce foreign keys by default (unless you add them), but it's good practice.

### 409 Conflict
If some rows were already inserted (e.g., from a partial run), you'll get `409 Conflict`. Either:
- Skip the table (check count first)
- Clear the table: `DELETE FROM {table}` then re-insert
- Use `PUT` with `Prefer: resolution=merge-duplicates` (upsert)

### Large Attachments
Transaction attachments are stored as base64 data URLs in the `attachments` JSONB column. These can be very large (multi-MB). The migration script handles them correctly via urllib, but it may be slow. For large datasets, consider batching or async insertion.
