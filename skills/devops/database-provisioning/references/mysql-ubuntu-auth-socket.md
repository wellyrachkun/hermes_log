# Session Notes: MySQL 8.0 Setup on Ubuntu 24.04

## Context
Server: Ubuntu 24.04 (Noble)
MySQL version installed: 8.0.45

## Problem
After `apt-get install mysql-server`, root authentication defaults to `auth_socket` plugin. This breaks password-based connections from apps and remote users.

## Resolution

```bash
# Verify plugin
mysql -u root -e "SELECT user,host,plugin FROM mysql.user WHERE user='root';"
# Output showed: root | localhost | auth_socket

# Fix: switch to mysql_native_password
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root'; FLUSH PRIVILEGES;"

# Create dev database
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS web_semicommerce_development CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## Verification
```bash
mysql -u root -proot -e "SHOW DATABASES LIKE 'web_semicommerce%';"
# Output: web_semicommerce_development
```

## Key Takeaway
Always check `mysql.user` plugin column immediately after MySQL install on Ubuntu. `auth_socket` is the default for root and will silently break password-based clients.
