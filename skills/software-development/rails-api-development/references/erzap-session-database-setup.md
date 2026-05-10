# Erzap Main — Session Database Setup

The Erzap POS main app uses ActiveRecord session store with a **separate MySQL database**
(`erzap_session`) configured in `config/database.yml`:

```yaml
session:
  <<: *default
  database: erzap_session
```

The initializer `config/initializers/session_store.rb` establishes a dedicated connection:

```ruby
Session.establish_connection :session
Rails.application.config.session_store :active_record_store, class_name: 'Session'
```

## Symptom

When the `erzap_session` database is missing, **every request** fails with:

```
ActiveRecord::NoDatabaseError (Unknown database 'erzap_session'):
  config/initializers/session_store.rb:13:in `connection'
```

Root path returns HTTP 500 even though the Rails boot itself succeeds.

## Fix

### 1. Create the database

```bash
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS erzap_session CHARACTER SET utf8 COLLATE utf8_general_ci;"
```

### 2. Create the sessions table

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id int(11) NOT NULL AUTO_INCREMENT,
  session_id varchar(255) NOT NULL,
  data longtext,
  created_at datetime DEFAULT NULL,
  updated_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY index_sessions_on_session_id (session_id),
  KEY index_sessions_on_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### 3. Verify

```bash
cd ~/projects/works/main
mise exec ruby@2.5.9 -- bundle _1.17.3_ exec rails runner "puts Session.connection.active? ? 'OK' : 'FAIL'"
```

## Migration note

There are two session-related migrations:
- `db/migrate/20120626150805_add_sessions_table.rb` — original, targets main DB
- `db/migrate/20240809211543_create_session_table_on_db_erzap_session.rb` — newer, creates table on `erzap_session` DB and copies old sessions from main DB

The newer migration uses `Session.connection` (which connects to `erzap_session`) and also tries
`ActiveRecord::Base.connection.select_all("SELECT * FROM sessions")` to copy existing sessions
from the main DB. On a fresh setup where neither table exists, the manual CREATE TABLE above
is simpler and avoids the copy step failing.
