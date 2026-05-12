---
name: finance-couple-mcp
description: "Develop and maintain the Finance Couple MCP server — a Python stdio MCP server that wraps PostgreSQL with CRUD tools for transactions, wallets, categories, and reports."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [MCP, PostgreSQL, Finance, psycopg2, Tools]
    related_skills: [postgrest-self-host, native-mcp]
---

# Finance Couple MCP Server

The MCP server at `/root/hermes-mcp-servers/finance_couple/server.py` provides CRUD tools for the Finance Couple app's PostgreSQL database. It runs as a **stdio MCP server** spawned by Hermes on startup. Tools are auto-discovered and registered with the `mcp_finance_*` prefix.

## When to Use

- Adding new CRUD tools to the finance MCP server
- Updating tool signatures, validation, or SQL queries
- Fixing bugs in tool logic (balance updates, query filters, summaries)
- Adding new features that the frontend supports but MCP doesn't (e.g., transfer)
- Debugging MCP server errors or connection issues

## Architecture

```
Hermes Agent → stdio spawn → python3 server.py → psycopg2 → PostgreSQL (infra-db-1)
```

- **Transport**: stdio (command + args in `~/.hermes/config.yaml`)
- **DB**: PostgreSQL 15 Alpine on `127.0.0.1:5432`, database `cozyfinance`
- **Framework**: `FastMCP` from `mcp.server.fastmcp`
- **DB driver**: `psycopg2` with RealDictCursor for dict rows

## Key Paths

| Item | Path |
|------|------|
| MCP server code | `/root/hermes-mcp-servers/finance_couple/server.py` |
| Python venv | `/root/hermes-mcp-servers/finance_couple/venv/` |
| Config (Hermes) | `~/.hermes/config.yaml` → `mcp_servers.finance` |
| DB host | `127.0.0.1:5432` |
| DB name | `cozyfinance` |
| Frontend project | `/root/projects/freelance/finance_couple/` |

## DB Connection Details

```python
DB = {
    "host": "127.0.0.1",
    "port": 5432,
    "dbname": "cozyfinance",
    "user": "postgres",
    "password": "pg_secret_2026",
}
```

Environment overrides: `PG_HOST`, `PG_PORT`, `PG_DB`, `PG_USER`, `PG_PASSWORD`.

## Tool Patterns

### CRUD Tools

Every tool follows this pattern:

```python
@mcp.tool()
def tool_name(param1: str, param2: int, ...) -> str:
    """Docstring with Args section (required for LLM context)."""
    # 1. Validate inputs early
    if type not in ("expense", "income", "transfer"):
        return f"❌ type harus 'expense', 'income', atau 'transfer'"

    # 2. Open connection
    conn = _db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)  # for SELECT
        # or cur = conn.cursor() for INSERT/UPDATE/DELETE

        # 3. Execute query
        cur.execute("INSERT INTO ...", (param1, param2, ...))

        # 4. Commit and return
        conn.commit()
        return f"✅ Success message with {details}"
    except Exception as e:
        conn.rollback()
        return f"❌ Gagal: {e}"
    finally:
        conn.close()
```

### Return Format
- **Success**: `✅/💰/💸/🔴/🟢 Message with details`
- **Error**: `❌ Human-readable Indonesian error message`
- **Not found**: `⚠️ Warning message`
- **Empty**: `📭 No data message`

### Transaction Type Handling

The frontend uses 3 types: `"expense"`, `"income"`, `"transfer"`. The `"transfer"` type uses two categories:
- `"transfer keluar"` — decrements wallet balance (like expense)
- `"transfer masuk"` — increments wallet balance (like income)

**Balance calculations** must handle transfer type explicitly:
```python
# Adding a transaction
if tx_type == "transfer":
    delta = tx_amount if tx_cat == "transfer masuk" else -tx_amount
elif tx_type == "expense":
    delta = -tx_amount
else:  # income
    delta = tx_amount

# Reverting on delete
if tx_type == "transfer":
    delta = -tx_amount if tx_cat == "transfer masuk" else tx_amount
elif tx_type == "expense":
    delta = tx_amount
else:
    delta = -tx_amount
```

**SQL summaries** must also handle transfers:
```sql
-- Effective type for grouping
CASE
    WHEN type = 'transfer' AND category = 'transfer masuk' THEN 'income'
    WHEN type = 'transfer' AND category = 'transfer keluar' THEN 'expense'
    ELSE type
END AS effective_type

-- Filtering expenses including transfer keluar
WHERE (type='expense' OR (type='transfer' AND category = 'transfer keluar'))
```

## Updating the Server

### Workflow

1. **Edit** `/root/hermes-mcp-servers/finance_couple/server.py`
2. **Kill** the running process: `pkill -f "hermes-mcp-servers/finance_couple/server.py"`
3. **Hermes auto-restarts** the server on next MCP tool call (new session or reconnection)

The MCP process PID can be found with:
```bash
ps aux | grep "hermes-mcp-servers/finance_couple" | grep -v grep
```

### Session Tool Registration

- MCP tools are registered **at Hermes session startup**
- Tools modified after session start won't appear until next reconnect/session
- In the current session, you can test changes by calling tools that already exist — they will use the new code
- New tools (like `transfer_between_wallets`) won't be available until reconnection

## Current Tools

| Tool | Type | Description |
|------|------|-------------|
| `add_transaction` | CRUD | Create: expense/income/transfer |
| `transfer_between_wallets` | CRUD | Atomic 2-transaction transfer + balance update |
| `list_transactions` | Read | Filtered transaction list |
| `get_recent_transactions` | Read | Shortcut for latest N transactions |
| `delete_transaction` | CRUD | Delete + revert wallet balance |
| `cancel_transaction` | CRUD | Cancel transaction within 1 hour + revert balance |
| `list_wallets` | Read | All wallets with balances and details |
| `add_wallet` | CRUD | Create wallet |
| `update_wallet` | CRUD | Update wallet name/icon/color |
| `list_categories` | Read | All categories grouped by type |
| `add_category` | CRUD | Create category |
| `delete_category` | CRUD | Delete category |
| `get_summary` | Report | Monthly summary with top categories + per person |
| `get_balance_sheet` | Report | Family net worth |

## Querying the DB Directly (psql not installed)

`psql` is not installed on the VPS. Use Python with psycopg2:

```bash
/root/hermes-mcp-servers/finance_couple/venv/bin/python3 -c "
import psycopg2
conn = psycopg2.connect(host='127.0.0.1', port=5432, dbname='cozyfinance',
                        user='postgres', password='pg_secret_2026')
cur = conn.cursor()
cur.execute(\"SELECT ...\")
for r in cur.fetchall():
    print(r)
conn.close()
"
```

Or for quick balances:
```bash
/root/hermes-mcp-servers/finance_couple/venv/bin/python3 -c "
import psycopg2
conn = psycopg2.connect(host='127.0.0.1', dbname='cozyfinance', user='postgres', password='pg_secret_2026')
cur = conn.cursor()
cur.execute('SELECT name, balance FROM wallets ORDER BY name')
for r in cur.fetchall(): print(r)
conn.close()
"
```

## Frontend Alignment

The MCP server mirrors the frontend's data model. Key alignment points:
- **Transaction types**: `"income" | "expense" | "transfer"` (from `src/types/index.ts`)
- **Transfer pattern**: 2 transactions both `type: "transfer"`, with `"transfer keluar"` and `"transfer masuk"` categories
- **Balance updates**: Same logic as `src/db/sqlite.ts` — transfer masuk = +amount, transfer keluar = -amount
- **AuditLog**: Not yet in MCP (frontend has it)

When the frontend adds features, update the MCP server to match:
1. Check `src/types/index.ts` for type changes
2. Check `src/db/sqlite.ts` for new functions
3. Check existing MCP tools for analogous patterns
4. Test balance consistency after updates

## References

- `references/db-schema.md` — Complete DB schema with table structures and relationships
- `references/upload-server.md` — Flask upload server for file attachments: setup, nginx, migration

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| `psql: command not found` | Use Python + psycopg2 from the venv (see above) |
| MCP server won't start | Check `~/.hermes/logs/mcp-stderr.log` for Python traceback |
| Wallet balances drifted | Run `recalculateAllBalance` from the frontend Settings page |
| Transfer not in summaries | All `get_summary` queries must handle `type='transfer'` explicitly |
| `add_transaction` rejected "transfer" | Update the type validation to include "transfer" |
| New tool not available | Kill MCP process so Hermes re-spawns and re-registers tools |
| Shell quoting breaks complex JSON | Use Python `-c` for DB operations, not shell pipes |
| Delete doesn't revert balance | `delete_transaction` must `UPDATE wallets SET balance = balance + delta` before DELETE |
