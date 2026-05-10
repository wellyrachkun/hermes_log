# Session Notes: z4comp SVN Servers

## Repositories

| Name | URL | Local Path | Revision (at session) | Description |
|------|-----|------------|----------------------|-------------|
| erzap/main | `http://svn.z4comp.com/erzap/main` | `~/projects/works/main` | 7067 | Erzap POS/ERP system (Rails backend, sales, inventory, service, marketplace) |
| erzap_web | `http://svn.z4comp.com/erzap_web` | `~/projects/works/erzap_web` | 826 | Erzap company website (Rails 4.2, SEO/GEO focused, www.erzap.com) |

## Auth Credentials Used

- **Username**: `welly`
- **Password**: `welly123`
- **Auth cache location**: `~/.subversion/auth/svn.simple/`
- **⚠️ Headless GPG issue**: Existing cached files may use `passtype: gpg-agent` and fail silently on headless servers. Always keep `--username welly --password welly123` ready as fallback. To fix permanently, ensure `~/.subversion/config` has `store-plaintext-passwords = yes` and re-authenticate once.

## Setup Commands (Reproducible)

```bash
# 1. Enable SVN auth caching
mkdir -p ~/.subversion
cat > ~/.subversion/config << 'EOF'
[auth]
store-passwords = yes
store-auth-creds = yes
store-plaintext-passwords = yes
EOF

# 2. Clone repos
mkdir -p ~/projects/works
cd ~/projects/works
svn checkout http://svn.z4comp.com/erzap/main --username welly --password welly123 main
svn checkout http://svn.z4comp.com/erzap_web --username welly --password welly123 erzap_web

# 3. Verify auth cache
ls ~/.subversion/auth/svn.simple/
```

## erzap_web Project Context (from CLAUDE.md)

- **Live URL**: https://www.erzap.com
- **Stack**: Ruby on Rails 4.2.11.3, MySQL, Bootstrap 5.3, jQuery, CoffeeScript
- **Target**: UKM (SME) customers
- **Company**: PT. ERZAP ERP INDONESIA
- **Has AI agent integrations**: Python bots, MCP server, article management API
- **Key constraint**: Rails 4.2 — must NOT use Rails 5/6/7 features (`ApplicationRecord`, `before_action`, `.or()`, ActiveStorage, ActionCable, etc.)
