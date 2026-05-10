# Windows SSH Client Quirks

Session-tested notes for Windows 10/11 OpenSSH client.

## ssh-copy-id Missing

Windows OpenSSH (`C:\Windows\System32\OpenSSH\ssh.exe`) does **not** include `ssh-copy-id`. Three workarounds:

1. **Copy public key string manually** to server admin (paste in chat / email).
2. **PowerShell one-liner** (requires password login still working):
   ```powershell
   $pubKey = Get-Content C:\Users\$env:USERNAME\.ssh\id_ed25519.pub -Raw
   ssh user@host "mkdir -p ~/.ssh && echo $pubKey >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   ```
3. **Install Git for Windows** → includes `ssh-copy-id` in Git Bash.

## SSH Config IdentityFile Paths

All three formats work in `C:\Users\<USER>\.ssh\config`:

```ssh-config
# Best — tilde expansion works on Windows too
IdentityFile ~/.ssh/id_ed25519

# Alternative — forward slashes
IdentityFile C:/Users/Bear/.ssh/id_ed25519

# Alternative — backslashes MUST be quoted
IdentityFile "C:\Users\Bear\.ssh\id_ed25519"
```

## Generating Keys on Windows

```powershell
ssh-keygen -t ed25519 -C "device-label"
# Default save path: C:\Users\<USER>\.ssh\id_ed25519
# Empty passphrase recommended for dev convenience
```

## VS Code Remote from Windows

- Extension: **Remote - SSH** (Microsoft)
- After first connect, VS Code installs its server on the remote Linux host automatically.
- If behind a proxy/VPN, ensure port 22 outbound is open.
