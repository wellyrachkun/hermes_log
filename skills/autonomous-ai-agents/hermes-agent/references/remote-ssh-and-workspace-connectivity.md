# Remote SSH + Hermes Workspace Connectivity Checklist

Use this when users develop from Windows laptops (VS Code Remote-SSH) against a Linux VPS.

## 1) Windows SSH key setup (no `ssh-copy-id`)

PowerShell commonly lacks `ssh-copy-id`. Use one of these:

```powershell
# Show public key to copy manually
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

```powershell
# Pipe public key into server authorized_keys
ssh user@host "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" < $env:USERPROFILE/.ssh/id_ed25519.pub
```

Verify:

```powershell
ssh -v user@host
```

Look for `Offering public key` and successful auth without password prompt.

## 2) VS Code Remote-SSH config

Recommended entry:

```sshconfig
Host hermes-vps
  HostName <server-ip>
  User root
  IdentityFile ~/.ssh/id_ed25519
```

On Windows, `IdentityFile` can also be `C:/Users/<name>/.ssh/id_ed25519`.

## 3) Hermes Workspace disconnected banner

If UI shows **Hermes Agent not connected**:

1. Check gateway health:
   ```bash
   hermes gateway status
   curl -sS http://127.0.0.1:8642/health
   ```
2. Confirm listener bindings:
   ```bash
   ss -tlnp | grep -E ':8642\b|:9119\b|:3000\b'
   ```
3. Ensure workspace env uses loopback for gateway API:
   - `HERMES_API_URL=http://127.0.0.1:8642`
   - `HERMES_DASHBOARD_URL=http://127.0.0.1:9119`

If API is bound to localhost only, using public IP in `HERMES_API_URL` can produce disconnected/onboarding state.

## 4) Dev server reliability note

`pnpm dev` run as detached background may emit `tcsetattr: Inappropriate ioctl for device` in non-TTY contexts. If unstable, run under tmux:

```bash
tmux new-session -d -s hermes-dev 'cd ~/hermes-workspace && pnpm dev'
```

Check:

```bash
tmux capture-pane -t hermes-dev -p
```
