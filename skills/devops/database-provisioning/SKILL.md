---
name: database-provisioning
description: "Provision databases on Ubuntu servers: install MySQL/PostgreSQL, create databases, manage users, and handle common authentication pitfalls."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [MySQL, PostgreSQL, Database, Ubuntu, DevOps, Provisioning]
    related_skills: [remote-dev-setup]
---

# Database Provisioning

Install and configure database servers on Ubuntu, create databases with proper charsets, and handle auth/user setup.

---

## MySQL 8.0 on Ubuntu

### Install

```bash
apt-get update && apt-get install -y mysql-server
systemctl is-active mysql
```

### Root Auth Pitfall: auth_socket

MySQL 8.0 on Ubuntu defaults root to `auth_socket` plugin. This means:
- `mysql -u root` only works when run as the Linux `root` user via socket.
- External apps and non-root Linux users cannot log in with a password.
- You must switch to `mysql_native_password` (or `caching_sha2_password`) for password-based access.

```bash
# Check current root auth plugin
mysql -u root -e "SELECT user,host,plugin FROM mysql.user WHERE user='root';"

# Switch to password auth
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password'; FLUSH PRIVILEGES;"
```

### Create Database

```bash
mysql -u root -p<password> -e "CREATE DATABASE IF NOT EXISTS myapp_development CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Import SQL Dump

```bash
# Import
mysql -u root -p<password> myapp_development < /path/to/backup.sql

# Quick verification
mysql -u root -p<password> -e "USE myapp_development; SHOW TABLES;"
```

### Create Dedicated User (Recommended)

```bash
mysql -u root -p<password> -e "CREATE USER IF NOT EXISTS 'myapp'@'localhost' IDENTIFIED BY 'secure_password'; GRANT ALL PRIVILEGES ON myapp_development.* TO 'myapp'@'localhost'; FLUSH PRIVILEGES;"
```

---

## PostgreSQL on Ubuntu

### Install

```bash
apt-get update && apt-get install -y postgresql postgresql-contrib
systemctl is-active postgresql
```

### Create Database & User

```bash
sudo -u postgres psql -c "CREATE USER myapp WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "CREATE DATABASE myapp_development OWNER myapp ENCODING 'UTF8';"
```

---

## External GUI Client Access (Recommended: SSH Tunnel)

For Windows GUI tools (SQLyog, HeidiSQL, DBeaver, MySQL Workbench), prefer SSH tunneling instead of exposing MySQL `3306` publicly. Keep MySQL bound to `127.0.0.1` on the server and create a dedicated user for local/tunneled access:

```bash
PASS='change_me'
mysql --defaults-extra-file=/etc/mysql/debian.cnf -e "\
CREATE USER IF NOT EXISTS 'pc_mysql'@'localhost' IDENTIFIED BY '${PASS}'; \
CREATE USER IF NOT EXISTS 'pc_mysql'@'127.0.0.1' IDENTIFIED BY '${PASS}'; \
GRANT ALL PRIVILEGES ON *.* TO 'pc_mysql'@'localhost'; \
GRANT ALL PRIVILEGES ON *.* TO 'pc_mysql'@'127.0.0.1'; \
FLUSH PRIVILEGES;"
```

If SQLyog or another older client fails with `Plugin caching_sha2_password could not be loaded`, switch only that GUI user to `mysql_native_password`:

```bash
mysql --defaults-extra-file=/etc/mysql/debian.cnf -e "\
ALTER USER 'pc_mysql'@'localhost' IDENTIFIED WITH mysql_native_password BY '${PASS}'; \
ALTER USER 'pc_mysql'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '${PASS}'; \
FLUSH PRIVILEGES;"
```

For SQLyog's built-in SSH tunnel:
- MySQL tab: `Host=127.0.0.1`, `Port=3306`, `User=pc_mysql`.
- SSH tab: VPS public IP/SSH port/user/key or password.
- Do **not** use the local forwarded port (e.g. `3307`) when SQLyog itself manages the SSH tunnel.

## Common Pitfalls

| Problem | Cause & Fix |
|---------|-------------|
| `Access denied for user 'root'@'localhost'` | Root still on `auth_socket`. Switch plugin to `mysql_native_password`. |
| `ERROR 1698 (28000)` | Same as above — MySQL 8 default on Ubuntu. |
| `Plugin caching_sha2_password could not be loaded` in SQLyog | Older SQLyog/libmysql clients do not support MySQL 8 `caching_sha2_password`. Use `mysql_native_password` for the dedicated GUI user. |
| GUI client through built-in SSH tunnel cannot connect | In the MySQL tab use remote MySQL endpoint `127.0.0.1:3306`; only manual `ssh -L 3307:127.0.0.1:3306` uses local port `3307`. |
| Rails/Django can't connect to DB | Verify user exists, password correct, and host is `localhost` (not `127.0.0.1` unless MySQL user is `root@'%'`). |
| SQLyog says `Plugin caching_sha2_password could not be loaded` | Older SQLyog clients do not support MySQL 8's default `caching_sha2_password`. For the dedicated client user, run `ALTER USER 'user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';` and repeat for `'user'@'127.0.0.1'` when connecting through an SSH tunnel. |
| Wrong charset causing 💩 emojis | Always create DB with `utf8mb4`, not `utf8`. |
| PostgreSQL `REAL` silently rounds large integers | `REAL` is float4 with ~7 decimal digits of precision. Integers > 16,777,216 (2^24) lose precision — e.g., 22,731,625 rounds to 22,731,600. For financial/monetary columns, use `BIGINT` (int8) or `NUMERIC`. Migrate with `ALTER TABLE t ALTER COLUMN c TYPE BIGINT USING c::BIGINT;`. |
| PostgreSQL `REAL` used for `amount`/`balance` in financial apps | Same root cause as above. In schema design, never use `REAL`/`FLOAT` for currency. Use `BIGINT` for integer-denominated amounts (IDR cents optional) or `NUMERIC(precision, scale)` for decimal amounts. Also applies to Supabase/Postgres-backed apps where the PostgREST API will return float-formatted JSON (e.g., `22731600.0`). |

## PostgreSQL Column Type Pitfall: REAL vs BIGINT

### Symptoms
- User inputs exact integer (e.g., 22,731,625) but database stores a different number (e.g., 22,731,600).
- Supabase API returns float notation: `"balance": 22731600.0` instead of `22731600`.
- Small amounts work fine; large amounts (>16M) show precision loss.

### Root Cause
PostgreSQL `REAL` is IEEE 754 single-precision (float4). Mantissa is 23 bits + 1 implicit = 24 bits. Integers up to 2^24 (16,777,216) are exact; beyond that, precision degrades in increments of 2, 4, 8, etc.

### Fix
```sql
ALTER TABLE wallets ALTER COLUMN balance TYPE BIGINT USING balance::BIGINT;
ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT USING amount::BIGINT;
```

### Prevention
In migration SQL, declare financial columns as `BIGINT` (or `NUMERIC`) from the start. Never use `REAL` or `FLOAT` for money.

Refer to `references/postgres-real-precision-pitfall.md` for full diagnosis trace.

---

## References

- `references/mysql-ubuntu-auth-socket.md` — Session transcript: converting root from auth_socket to password auth.
- `references/postgres-real-precision-pitfall.md` — REAL float precision loss for integers >16M.
- See also: **[postgrest-self-host](../../devops/postgrest-self-host/SKILL.md)** — Replace Supabase cloud with self-hosted PostgreSQL + PostgREST.
