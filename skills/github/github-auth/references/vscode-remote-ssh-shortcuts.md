# VS Code Remote-SSH Shortcut Templates

Ready-to-copy batch files for Windows desktop. Save with `.bat` extension and double-click to open VS Code directly on a remote folder.

---

## Basic Template

```batch
@echo off
code --remote ssh-remote+USERNAME@HOSTNAME /absolute/path/on/server
```

> Replace `USERNAME@HOSTNAME` with your SSH target (e.g., `root@43.153.210.112`).
> Replace `/absolute/path/on/server` with the project folder.

---

## With SSH Config Alias (Cleaner)

Add this to `%USERPROFILE%\.ssh\config` on the Windows laptop:

```
Host myserver
    HostName 43.153.210.112
    User root
    IdentityFile ~/.ssh/id_ed25519
```

Then the batch file becomes:

```batch
@echo off
code --remote ssh-remote+myserver /root/projects/works/main
```

---

## Multi-Project Shortcuts

| Project | Batch content |
|---------|---------------|
| **Erzap Main** | `code --remote ssh-remote+myserver /root/projects/works/main` |
| **Erzap Web** | `code --remote ssh-remote+myserver /root/projects/works/erzap_web` |
| **Travel Agent** | `code --remote ssh-remote+myserver /root/projects/freelance/travel_agent` |
| **Joy Phone** | `code --remote ssh-remote+myserver /root/projects/freelance/joy_phone` |

---

##macOS / Linux Equivalent

On Unix systems, use shell aliases instead of batch files:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias vsc-main='code --remote ssh-remote+myserver /root/projects/works/main'
alias vsc-web='code --remote ssh-remote+myserver /root/projects/works/erzap_web'
```

---

## Pretty Icons (Windows)

1. Right-click `.bat` file → **Create shortcut**
2. Right-click shortcut → **Properties** → **Change Icon...**
3. Browse to VS Code executable:
   - `%LocalAppData%\Programs\Microsoft VS Code\Code.exe`
4. Select the VS Code icon → OK

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Could not establish connection" | SSH key not loaded — run `ssh-add ~/.ssh/id_ed25519` in PowerShell, or ensure Pageant/ssh-agent is running |
| Prompts for password | Public key not in server's `~/.ssh/authorized_keys` — re-run key installation |
| "Remote extension not installed" | Install **Remote - SSH** extension in VS Code first |
| Wrong platform detected | Manually select **Linux** when VS Code asks for the remote platform |
| Folder opens empty | Check the absolute path exists on the server (`ssh myserver "ls /path"`) |
