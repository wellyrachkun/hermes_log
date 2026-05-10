---
name: github-auth
description: "GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login."
version: 1.2.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [GitHub, Authentication, Git, gh-cli, SSH, Setup]
    related_skills: [github-pr-workflow, github-code-review, github-issues, github-repo-management]
---

# GitHub Authentication Setup

This skill sets up authentication so the agent can work with GitHub repositories, PRs, issues, and CI. It covers two paths:

- **`git` (always available)** — uses HTTPS personal access tokens or SSH keys
- **`gh` CLI (if installed)** — richer GitHub API access with a simpler auth flow

## Detection Flow

When a user asks you to work with GitHub, run this check first:

```bash
# Check what's available
git --version
gh --version 2>/dev/null || echo "gh not installed"

# Check if already authenticated
gh auth status 2>/dev/null || echo "gh not authenticated"
git config --global credential.helper 2>/dev/null || echo "no git credential helper"
```

**Decision tree:**
1. If `gh auth status` shows authenticated → you're good, use `gh` for everything
2. If `gh` is installed but not authenticated → use "gh auth" method below
3. If `gh` is not installed → use "git-only" method below (no sudo needed)

---

## Method 1: Git-Only Authentication (No gh, No sudo)

This works on any machine with `git` installed. No root access needed.

### Option A: HTTPS with Personal Access Token (Recommended)

This is the most portable method — works everywhere, no SSH config needed.

**Step 1: Create a personal access token**

Tell the user to go to: **https://github.com/settings/tokens**

- Click "Generate new token (classic)"
- Give it a name like "hermes-agent"
- Select scopes:
  - `repo` (full repository access — read, write, push, PRs)
  - `workflow` (trigger and manage GitHub Actions)
  - `read:org` (if working with organization repos)
- Set expiration (90 days is a good default)
- Copy the token — it won't be shown again

**Step 2: Configure git to store the token**

```bash
# Set up the credential helper to cache credentials
# "store" saves to ~/.git-credentials in plaintext (simple, persistent)
git config --global credential.helper store

# Now do a test operation that triggers auth — git will prompt for credentials
# Username: <their-github-username>
# Password: <paste the personal access token, NOT their GitHub password>
git ls-remote https://github.com/<their-username>/<any-repo>.git
```

After entering credentials once, they're saved and reused for all future operations.

**Alternative: cache helper (credentials expire from memory)**

```bash
# Cache in memory for 8 hours (28800 seconds) instead of saving to disk
git config --global credential.helper 'cache --timeout=28800'
```

**Alternative: set the token directly in the remote URL (per-repo)**

```bash
# Embed token in the remote URL (avoids credential prompts entirely)
git remote set-url origin https://<username>:<token>@github.com/<owner>/<repo>.git
```

**Step 3: Configure git identity**

```bash
# Required for commits — set name and email
git config --global user.name "Their Name"
git config --global user.email "their-email@example.com"
```

**Step 4: Verify**

```bash
# Test push access (this should work without any prompts now)
git ls-remote https://github.com/<their-username>/<any-repo>.git

# Verify identity
git config --global user.name
git config --global user.email
```

### Option B: SSH Key Authentication

Good for users who prefer SSH or already have keys set up.

**Step 1: Check for existing SSH keys**

```bash
ls -la ~/.ssh/id_*.pub 2>/dev/null || echo "No SSH keys found"
```

**Step 2: Generate a key if needed**

```bash
# Generate an ed25519 key (modern, secure, fast)
ssh-keygen -t ed25519 -C "their-email@example.com" -f ~/.ssh/id_ed25519 -N ""

# Display the public key for them to add to GitHub
cat ~/.ssh/id_ed25519.pub
```

Tell the user to add the public key at: **https://github.com/settings/keys**
- Click "New SSH key"
- Paste the public key content
- Give it a title like "hermes-agent-<machine-name>"

### Reusing the Same Key for Other Servers

The same SSH key pair works for any server (e.g., a VPS, an office server, or SVN over SSH). Only the public key needs to be placed in the server's `~/.ssh/authorized_keys` file.

**On the target server:**
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3... user@host" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Windows `ssh-copy-id` workaround:**
Windows PowerShell does not include `ssh-copy-id`. Two options:
1. **Manual paste** — Have the user run `Get-Content ~/.ssh/id_ed25519.pub` in PowerShell, copy the output, and either paste it to the agent (who appends it server-side) or paste it into the server's `~/.ssh/authorized_keys` themselves.
2. **PowerShell one-liner** — From their laptop:
```powershell
$pubKey = Get-Content ~/.ssh/id_ed25519.pub -Raw
ssh user@server "mkdir -p ~/.ssh && echo $pubKey >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**Server-side SSH config verification:**
After installing a public key, auth can still fail if the SSH daemon does not explicitly allow pubkey authentication. On the server, verify:
```bash
grep -E "^PubkeyAuthentication|^PasswordAuthentication" /etc/ssh/sshd_config
```
If `PubkeyAuthentication` is missing or commented out, explicitly enable it and restart:
```bash
echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
systemctl restart sshd   # or service ssh restart
```
This is especially common on minimal/cloud images where only `PasswordAuthentication yes` is set by default.

---

### VS Code Remote-SSH Desktop Shortcuts

After an SSH key is installed on a server, the fastest daily workflow is VS Code Remote-SSH with one-click desktop shortcuts.

**1. Connect from VS Code**
- Install the **Remote - SSH** extension (by Microsoft)
- `Ctrl+Shift+P` → **"Remote-SSH: Connect to Host..."**
- Enter `user@hostname` (e.g., `root@43.153.210.112`)
- Select **Linux** when asked for the platform
- Wait for the window to reconnect (green indicator in bottom-left)

**2. Create one-click batch shortcuts (Windows)**

Save these as `.bat` files on the desktop. Double-clicking opens VS Code directly to the remote folder without prompts.

```batch
@echo off
code --remote ssh-remote+root@43.153.210.112 /root/projects/works/main
```

```batch
@echo off
code --remote ssh-remote+root@43.153.210.112 /root/projects/works/erzap_web
```

> **Tip:** Add an SSH config alias (`Host myserver` in `~/.ssh/config`) to keep the batch files clean: `code --remote ssh-remote+myserver /path/to/project`

**3. Optional — pretty icons**
- Right-click `.bat` → **Create shortcut**
- Shortcut Properties → **Change Icon...**
- Browse to `%LocalAppData%\Programs\Microsoft VS Code\Code.exe`
- Pick the VS Code icon

See `references/vscode-remote-ssh-shortcuts.md` for ready-to-copy templates per project type.

**Step 3: Start ssh-agent and add the key**

The ssh-agent must be running and the key loaded, or git operations will fail silently.

```bash
# Start the agent in the background and add the key
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519
```

> **Pitfall:** In fresh terminal sessions (containers, CI, new SSH connections), ssh-agent is not running by default. You must start it and re-add the key each time, or add the commands above to `~/.bashrc`.

**Step 4: Add GitHub to known_hosts**

First-time connections to GitHub will fail with `Host key verification failed` until the host is trusted.

```bash
# Fetch and record GitHub's host key
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null
```

**Step 5: Test the connection**

```bash
ssh -T git@github.com
```

> **Expected before key is registered on GitHub:** `git@github.com: Permission denied (publickey).`  
> This is normal — it means the network path works, and the key just needs to be added to the GitHub account.  
> **Expected after key is registered:** `Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.`

**Step 4: Configure git to use SSH for GitHub**

```bash
# Rewrite HTTPS GitHub URLs to SSH automatically
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

**Step 5: Configure git identity**

```bash
git config --global user.name "Their Name"
git config --global user.email "their-email@example.com"
```

---

## Method 2: gh CLI Authentication

If `gh` is installed, it handles both API access and git credentials in one step.

### Interactive Browser Login (Desktop)

```bash
gh auth login
# Select: GitHub.com
# Select: HTTPS
# Authenticate via browser
```

### Token-Based Login (Headless / SSH Servers)

```bash
echo "<THEIR_TOKEN>" | gh auth login --with-token

# Set up git credentials through gh
gh auth setup-git
```

### Verify

```bash
gh auth status
```

---

## Using the GitHub API Without gh

When `gh` is not available, you can still access the full GitHub API using `curl` with a personal access token. This is how the other GitHub skills implement their fallbacks.

### Setting the Token for API Calls

```bash
# Option 1: Export as env var (preferred — keeps it out of commands)
export GITHUB_TOKEN="<token>"

# Then use in curl calls:
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

### Extracting the Token from Git Credentials

If git credentials are already configured (via credential.helper store), the token can be extracted:

```bash
# Read from git credential store
grep "github.com" ~/.git-credentials 2>/dev/null | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|'
```

### Helper: Detect Auth Method

Use this pattern at the start of any GitHub workflow:

```bash
# Try gh first, fall back to git + curl
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  echo "AUTH_METHOD=gh"
elif [ -n "$GITHUB_TOKEN" ]; then
  echo "AUTH_METHOD=curl"
elif [ -f ~/.hermes/.env ] && grep -q "^GITHUB_TOKEN=" ~/.hermes/.env; then
  export GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" ~/.hermes/.env | head -1 | cut -d= -f2 | tr -d '\n\r')
  echo "AUTH_METHOD=curl"
elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
  export GITHUB_TOKEN=$(grep "github.com" ~/.git-credentials | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
  echo "AUTH_METHOD=curl"
else
  echo "AUTH_METHOD=none"
  echo "Need to set up authentication first"
fi
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `git push` asks for password | GitHub disabled password auth. Use a personal access token as the password, or switch to SSH |
| `remote: Permission to X denied` | Token may lack `repo` scope — regenerate with correct scopes |
| `fatal: Authentication failed` | Cached credentials may be stale — run `git credential reject` then re-authenticate |
| `ssh: connect to host github.com port 22: Connection refused` | Try SSH over HTTPS port: add `Host github.com` with `Port 443` and `Hostname ssh.github.com` to `~/.ssh/config` |
| `Host key verification failed` (first SSH test) | Run `ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts` to trust GitHub's host key |
| `Permission denied (publickey)` after ssh-keyscan | Key is not yet registered on GitHub — add the public key at https://github.com/settings/keys; or ssh-agent is not running — run `eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519` |
| Credentials not persisting | Check `git config --global credential.helper` — must be `store` or `cache` |
| `ssh-copy-id: command not found` (Windows) | Windows does not ship `ssh-copy-id`. Use the PowerShell one-liner in the "Reusing the Same Key for Other Servers" section above, or have the user paste the pubkey content for manual installation. |
| SSH key still prompts for password despite correct `authorized_keys` | `PubkeyAuthentication` may not be explicitly enabled in `/etc/ssh/sshd_config`. Add `PubkeyAuthentication yes` and restart `sshd`. See "Server-side SSH config verification" above. |
| Multiple GitHub accounts | Use SSH with different keys per host alias in `~/.ssh/config`, or per-repo credential URLs |
| `gh: command not found` + no sudo | Use git-only Method 1 above — no installation needed |
| Git operations fail after reconnecting / new container | ssh-agent does not persist across sessions — re-run `eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519` or add it to `~/.bashrc` |
