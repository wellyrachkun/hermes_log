---
name: remote-dev-setup
description: "Set up remote development environments: SSH key management, VS Code Remote SSH, port forwarding, and Windows-to-Linux workflow quirks."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [SSH, VS Code, Remote Development, Port Forwarding, Windows, Linux]
    related_skills: [subversion-workflow, github-auth]
---

# Remote Development Setup

Connect local VS Code (especially on Windows) to a Linux server for development. Covers SSH key pair creation, auth, VS Code Remote-SSH extension, port forwarding for OAuth callbacks, and one-click shortcuts.

---

## 1. SSH Key Pair Generation

### Linux / macOS / WSL

```bash
ssh-keygen -t ed25519 -C "my-device" -f ~/.ssh/id_ed25519 -N ""
```

### Windows (PowerShell)

```powershell
ssh-keygen -t ed25519 -C "my-device"
# Press Enter to accept default path (C:\Users\<USER>\.ssh\id_ed25519)
# Press Enter for empty passphrase (recommended for dev machines)
```

> **Pitfall**: Windows OpenSSH (`ssh` bundled with Windows 10/11) does **not** include `ssh-copy-id`. You must install the public key manually (see Section 2).

---

## 2. Install Public Key on Remote Server

### Option A: Server-side (fastest if you have server access)

Copy the public key string from the client:

```bash
# Linux/macOS/WSL
cat ~/.ssh/id_ed25519.pub

# Windows PowerShell
Get-Content C:\Users\<USER>\.ssh\id_ed25519.pub
```

Then on the server, append it:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... comment" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Option B: Client-side manual (Windows, no ssh-copy-id)

```powershell
$pubKey = Get-Content C:\Users\<USER>\.ssh\id_ed25519.pub -Raw
ssh user@REMOTE_IP "mkdir -p ~/.ssh && echo $pubKey >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Option C: ssh-copy-id (Linux/macOS only)

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@REMOTE_IP
```

### Verify Key Auth Works

```bash
ssh -v user@REMOTE_IP
# Look for: "Authentications that can continue: publickey"
# Then: "Authentication succeeded (publickey)"
```

---

## 3. Server-Side SSH Hardening for Key Auth

If pubkey auth still prompts for password, ensure the server explicitly allows it:

```bash
echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
systemctl restart sshd
```

Verify file permissions (SSH is strict):

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## 4. SSH Config (Client-Side)

Create `~/.ssh/config` on the client to avoid typing IP and username repeatedly.

### Linux / macOS / WSL

```ssh-config
Host my-server
    HostName 192.168.1.100
    User myuser
    IdentityFile ~/.ssh/id_ed25519
```

### Windows

Path: `C:\Users\<USER>\.ssh\config`

```ssh-config
Host my-server
    HostName 192.168.1.100
    User myuser
    IdentityFile ~/.ssh/id_ed25519
```

> **Windows path formats for IdentityFile** (all valid):
> - `IdentityFile ~/.ssh/id_ed25519`  ← **Recommended** (uses `~` expansion)
> - `IdentityFile C:/Users/Bear/.ssh/id_ed25519`  ← forward slash
> - `IdentityFile "C:\Users\Bear\.ssh\id_ed25519"`  ← backslash **must be quoted**

---

## 5. VS Code Remote-SSH

### Prerequisites
- Install extension: **Remote - SSH** (Microsoft)
- SSH key auth must already work from terminal

### Connect
1. `Ctrl+Shift+P` → **"Remote-SSH: Connect to Host..."**
2. Type `my-server` (or `user@IP` if no config alias)
3. Select platform: **Linux**
4. Wait for VS Code window to open (green indicator bottom-left)

### Open Remote Folder
- `Ctrl+K Ctrl+O` → type `/path/on/server/to/project`
- Or use **Explorer → Open Folder**

### Open Terminal on Remote
- `` Ctrl+` `` (backtick) — opens bash/zsh directly on the server

---

## 6. Multi Ruby Versions on Remote Servers

For Rails/Ruby projects with different Ruby versions, prefer `mise` when it is already installed/activated. It avoids replacing the system Ruby and supports per-project versions via `mise.toml`.

### Discovery

```bash
command -v mise && mise --version
command -v ruby && ruby -v
find ~/projects -maxdepth 4 -name .ruby-version -o -name Gemfile.lock
```

### Install a legacy Ruby, e.g. Ruby 2.5.9p229 on Ubuntu 24.04

Ruby 2.5 is EOL and may need OpenSSL 1.1 built by ruby-build/mise. Install build dependencies first:

```bash
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git curl autoconf bison build-essential libyaml-dev libreadline-dev \
  zlib1g-dev libncurses5-dev libffi-dev libgdbm-dev libdb-dev uuid-dev

mise install ruby@2.5.9
```

Pin it per project instead of globally:

```bash
cd /path/to/legacy-rails-project
mise use ruby@2.5.9
printf '2.5.9\n' > .ruby-version  # optional, for tools that read .ruby-version
ruby -v  # expect: ruby 2.5.9p229
```

If `Gemfile.lock` says `BUNDLED WITH 1.17.3`, install/use that Bundler under the project Ruby:

```bash
gem install bundler -v 1.17.3 --no-document
bundle _1.17.3_ -v
```

For other projects, pin their own Ruby version:

```bash
cd /path/to/modern-project
mise install ruby@3.4.5
mise use ruby@3.4.5
ruby -v
```

### Verification

Use a fresh interactive shell to confirm `mise` activation works for VS Code Remote-SSH terminals:

```bash
bash -ic 'cd /path/to/legacy-rails-project && ruby -v && which ruby && bundle _1.17.3_ -v'
bash -ic 'cd /path/to/modern-project && ruby -v && which ruby'
```

### Native Rails dependency hints

Legacy Rails apps often need native package headers before `bundle install`:

```bash
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  default-libmysqlclient-dev libmagickwand-dev pkg-config imagemagick nodejs
```

If `bundle install` fails because the `Gemfile` requests a version but `Gemfile.lock` has another (e.g. `public_suffix = 4.0.7` vs lockfile `3.1.1`), do not force a full install blindly; update the specific gem or ask before changing lockfile:

```bash
bundle _1.17.3_ update public_suffix
```

### Pitfalls

| Problem | Cause & Fix |
|---------|-------------|
| `.ruby-version` ignored by `mise` | Create a project `mise.toml` with `mise use ruby@VERSION`; do not rely only on `.ruby-version`. |
| Bundler 1.17.3 crashes on Ruby 3.4 with `undefined method 'untaint'` | You are using the wrong Ruby for the legacy project. Ensure `mise use ruby@2.5.9` and shell activation are effective. |
| `mise install ruby@2.5.9` warns EOL | Expected; Ruby 2.5 is unsupported but sometimes required for old Rails apps. |
| `mise` works in one shell but not another | Verify shell activation (`eval "$(mise activate bash)"`) or that the user shell sources the mise activation line. |

---

## 7. Port Forwarding (Critical for OAuth / Callbacks)

When an app running on the remote server needs to receive a callback on `localhost` (e.g., OpenCode login, OAuth, Stripe CLI), forward the port from server → local machine.

### Method A: VS Code Ports Panel (easiest)

1. Ensure VS Code is connected to the remote host
2. Open **Ports** panel (icon in left sidebar, or `Ctrl+Shift+P` → "Ports: Focus on Ports View")
3. Click **+** (Forward a Port)
4. Type the server port, e.g. `1455`
5. VS Code creates a tunnel: `localhost:1455` on your laptop → `localhost:1455` on the server
6. Use `http://localhost:1455/...` in your local browser

> **Scope**: Port forwarding dies when the VS Code window closes.

### Method B: Manual SSH Tunnel

```bash
# From local machine
ssh -L 1455:localhost:1455 my-server
```

Leave the terminal open while you need the tunnel.

### Method C: App Built-in SSH Tunnel (GUI Database Tools)

For tools like SQLyog, HeidiSQL, DBeaver, and MySQL Workbench, prefer their built-in SSH tunnel when the user wants a simpler workflow than running `ssh -L` manually.

Example for MySQL on a VPS that listens only on server localhost:
- Database/MySQL tab: `Host=127.0.0.1`, `Port=3306`, database username/password.
- SSH tab: VPS public IP, SSH port `22`, SSH username, password or private key.

Pitfall: if the GUI owns the SSH tunnel, do **not** set the database port to a manual local forward like `3307`; use the remote service port (`3306`). Use `3307` only when the user separately runs `ssh -L 3307:127.0.0.1:3306 ...`.

SQLyog-specific key pitfall: older SQLyog builds may not support OpenSSH `ed25519` keys and may require a PuTTY `.ppk` private key. Generate a dedicated RSA PEM key, install its `.pub` line into `~/.ssh/authorized_keys`, then convert the private key with PuTTYgen:

```powershell
ssh-keygen -t rsa -b 4096 -m PEM -C "sqlyog-device" -f $env:USERPROFILE\.ssh\sqlyog_rsa
Get-Content $env:USERPROFILE\.ssh\sqlyog_rsa.pub
# PuTTYgen: Load sqlyog_rsa (All Files *.*) -> Save private key as sqlyog_rsa.ppk
```

Verify SSH separately before debugging SQLyog:

```powershell
Test-NetConnection <server-ip> -Port 22
ssh -i $env:USERPROFILE\.ssh\sqlyog_rsa <user>@<server-ip>
```

If PowerShell SSH works but SQLyog fails, suspect `.ppk`/key-format or SQLyog settings rather than server networking.

---

## 7. One-Click Shortcuts (Windows)

Create `.bat` files on the Windows desktop to open VS Code directly to a remote folder.

### Create `Open-Project.bat`

```batch
@echo off
code --remote ssh-remote+my-server /root/projects/works/main
```

> **Syntax**: `code --remote ssh-remote+<Host-from-ssh-config> <absolute-remote-path>`

### Optional: Custom Icon
1. Right-click `.bat` → **Create shortcut**
2. Right-click shortcut → **Properties** → **Change Icon...**
3. Browse to VS Code executable: `%LocalAppData%\Programs\Microsoft VS Code\Code.exe`

---

## 8. Multiple Devices / Keys

Add each device's public key to the server's `~/.ssh/authorized_keys` (one per line):

```bash
# On server
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAA... laptop
ssh-ed25519 AAAA... pc-rumah
EOF
```

Label keys with distinct comments (`-C "laptop"`, `-C "pc-rumah"`) for easy identification.

---

## Common Pitfalls

| Problem | Cause & Fix |
|---------|-------------|
| `ssh-copy-id` not found (Windows) | Windows OpenSSH doesn't ship it. Use manual server-side append or PowerShell Option B. |
| Still prompts for password after adding key | `~/.ssh` or `authorized_keys` permissions too open. Must be `700` and `600`. Or `PubkeyAuthentication` not enabled in `sshd_config`. |
| VS Code can't connect but terminal SSH works | VS Code may use a different SSH config path or agent. Ensure `IdentityFile` in `~/.ssh/config` is correct. |
| Port forwarding not showing in browser | Check that the app on the server is actually listening on `127.0.0.1:PORT`, not just `0.0.0.0:PORT`. Some frameworks bind differently. |
| `Permission denied (publickey)` | Wrong private key file specified, or public key not in server's `authorized_keys`. Run `ssh -v` to debug. |
| Batch file opens local folder instead of remote | Double-check `--remote ssh-remote+` syntax. Missing the `+` or wrong host name breaks remote detection. |

---

## References

- `references/windows-ssh-quirks.md` — Windows-specific SSH behavior and PowerShell snippets.
