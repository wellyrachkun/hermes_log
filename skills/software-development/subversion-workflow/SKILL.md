---
name: subversion-workflow
description: "SVN repository operations: authentication caching, checkout, update, and working with legacy Subversion repos alongside Git."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [SVN, Subversion, Authentication, Checkout, VCS, Legacy]
    related_skills: [github-auth, github-repo-management]
---

# Subversion Workflow

Work with SVN repositories — typically legacy corporate codebases or existing teams still on Subversion. This skill covers auth caching (so commands don't prompt repeatedly), checkout, and common workflows.

## Detection

```bash
svn --version --quiet
```

If SVN is not installed, the user may need `apt-get install subversion` or equivalent.

---

## Auth Caching (Critical)

SVN does **not** cache credentials by default. Without explicit configuration, every `svn update`, `svn status`, or `svn commit` will prompt for username/password.

### One-Time Setup

```bash
mkdir -p ~/.subversion
cat > ~/.subversion/config << 'EOF'
[auth]
store-passwords = yes
store-auth-creds = yes
store-plaintext-passwords = yes
EOF
```

> **Why `store-plaintext-passwords`?** On minimal/headless systems (containers, CI, servers without GNOME Keyring or KWallet), SVN refuses to cache encrypted passwords and will keep prompting. Setting this to `yes` allows plaintext caching in `~/.subversion/auth/svn.simple/`. Be aware of the security trade-off on shared machines.

### Verify Cache Is Working

After a successful authenticated operation, check:

```bash
ls ~/.subversion/auth/svn.simple/
```

You should see a hash-named file. Future commands will read from this cache.

---

## Checkout with Credentials

```bash
svn checkout http://svn.example.com/repo/path \
  --username USERNAME \
  --password PASSWORD \
  target_directory
```

With auth caching enabled, this single checkout stores credentials for all subsequent operations.

### After Checkout — Zero-Prompt Workflow

```bash
cd target_directory
svn update      # no prompt
svn status      # no prompt
svn diff        # no prompt
svn log -l 5    # no prompt
```

### Multiple Repos from the Same Server

Once auth is cached for a server domain (e.g., `http://svn.z4comp.com`), subsequent checkouts to other paths on the same server do **not** require `--username` or `--password` again:

```bash
# First checkout — credentials stored
svn checkout http://svn.example.com/repoA --username USER --password PASS repoA

# Second checkout — uses cached auth automatically
svn checkout http://svn.example.com/repoB repoB
```

---

## Switching Remote URLs

If the repo was already checked out but you need to change the remote (e.g., HTTP to HTTPS, or server migration):

```bash
svn switch --relocate OLD_URL NEW_URL
```

---

## Working with Changelists

SVN changelists group files for selective operations. Common use: a `skip-commit` changelist for files that should never be committed (local config, logs, schema.rb, Gemfile.lock with local diffs).

### Excluding a Changelist from Commit (sed range delete)

**❌ WRONG — grep only filters the header line, file entries below it pass through:**
```bash
# `--- Changelist 'skip-commit':` is removed, but `M  config/environment.rb` stays!
svn commit -m "msg" $(svn status | grep -v 'skip-commit' | grep '^[AM]' | awk '{print $2}')
```

**✅ CORRECT — sed range delete from changelist header to blank line:**
```bash
svn commit -m "msg" $(svn status | sed '/^--- Changelist .skip-commit.:/,/^$/d' | grep '^[AM]' | awk '{print $NF}')
```

The `sed '/PATTERN/,/^$/d'` deletes everything from the `--- Changelist 'skip-commit':` line through the next blank line, removing all files in that changelist.

### Wrapper Script (Recommended for Projects with skip-commit)

**⚠️ Always check first:** If `.svnci.sh` already exists in the project root, **use it** instead of raw `svn commit`. Raw `svn commit` without file arguments commits ALL modified files, including those in the `skip-commit`/`ignore-on-commit` changelist.

```bash
# Check if wrapper exists
if [ -f .svnci.sh ]; then
  ./.svnci.sh -m "pesan commit"
else
  # Only then use the sed-based filtering
  svn commit -m "msg" $(svn status | sed '/^--- Changelist .skip-commit.:/,/^$/d' | grep '^[AM]' | awk '{print $NF}')
fi
```

```bash
#!/bin/bash
# SVN commit wrapper — excludes skip-commit changelist
cd "$(dirname "$0")"
FILES=$(svn status | sed '/^--- Changelist .skip-commit.:/,/^$/d' | grep '^[AM]' | awk '{print $NF}')
if [ -z "$FILES" ]; then
  echo "No files to commit (outside skip-commit changelist)"
  exit 0
fi
svn commit "$@" $FILES
```

Usage: `./.svnci.sh -m "pesan commit"`

> If GPG-agent auth fails on headless servers, bake `--username USER --password PASS` into the script or pass as args.

### Reverting an Accidental Commit of Changelist Files

```bash
# Revert specific files to their state before the last commit
svn cat -r $(svn info --show-item revision --username U --password P) config/environment.rb > config/environment.rb
svn commit -m "Revert: file tidak untuk di-commit" config/environment.rb
```

### Committing ONLY a Specific Changelist
```bash
svn commit --changelist "my-feature" -m "Complete feature X"
```

### Committing Explicit File List (Avoiding Changelist Leak)

When changelist filtering via `sed`/`grep` is unreliable, list files explicitly:

```bash
svn commit -m "msg" app/assets/javascripts/application.js app/views/produk/_form.html.erb
```

This is the **safest** way to ensure only intended files are committed. Use `svn status` to see what needs committing, then construct the file list manually.

---

## Rolling Back Specific Files (No Full Reverse Merge)

When only a few files need to go back to an older revision (e.g., `Gemfile.lock`, `db/schema.rb` accidentally committed), you don't need to reverse-merge the whole revision:

```bash
# 1. Downgrade the files locally to the target revision
svn update -r7125 Gemfile.lock db/schema.rb

# 2. Commit them back — this "promotes" r7125 content to HEAD
svn commit -m "revert: Gemfile.lock dan db/schema.rb ke r7125" Gemfile.lock db/schema.rb
```

> After `svn update -rOLDREV`, the files show clean in `svn status` (mixed-revision state). The commit still works because SVN detects they differ from HEAD.

This is cleaner than a full reverse-merge when the revision contains files you want to keep.

---

## Undoing a Commit (Reverse Merge)

SVN doesn't have `git revert`. To undo revision `7126`:

### Step 1: Ensure Working Copy Is at Target Revision

```bash
svn update  # mixed-revision WCs can't reverse-merge
```

### Step 2: Reverse-Merge

```bash
svn merge -c -7126 .
```

This applies the **inverse** of revision 7126 to the working copy.

### Step 3: Review and Commit

```bash
svn status          # check what was undone
svn commit -m "Revert r7126: undo accidental commit of changelist files"
```

> **⚠️ WARNING:** Reverse-merging a revision that included `svn add` will **delete those files from disk**. If you need them back after the reverse merge, restore them from the repo:
> ```bash
> svn copy ^/main/path/to/file@7126 path/to/file
> ```

### Full Workflow: Undo a Commit Then Re-commit Only Intended Files

```bash
# 1. Undo the bad commit
svn update
svn merge -c -BAD_REV .

# 2. Restore any files that were added in BAD_REV (reverse merge deleted them)
svn copy ^/main/path/to/new_file.js@BAD_REV path/to/new_file.js

# 3. Revert unwanted files that the reverse merge re-modified
svn revert Gemfile.lock config/puma.rb db/schema.rb

# 4. Commit only the intended files explicitly
svn commit -m "msg" file1.js file2.html.erb new_file.js new_dir/
```

---

## Common Pitfalls

| Problem | Cause & Fix |
|---------|-------------|
| `svn update` keeps asking for password | `~/.subversion/config` missing or `store-plaintext-passwords` not set to `yes`. Re-run the auth caching setup. |
| `svn commit` fails "No more credentials" even though `~/.subversion/auth/svn.simple/` has cached files | Cached password uses `gpg-agent` passtype — the agent isn't running on this headless server. Use explicit `--username USER --password PASS` flags on every command, or re-save credentials with `store-plaintext-passwords = yes` in `~/.subversion/config`. |
| Files in a changelist still get committed despite grep filtering | `grep -v 'CHANGELIST-NAME'` only removes the `--- Changelist '...':` header line. File entries below it are normal `M`/`A` lines and pass through. Use the explicit path approach or commit-then-revert strategy instead. |
| `svn commit` tanpa argumen meng-commit file changelist juga | Changelists itu label, BUKAN filter commit. `svn commit` tanpa file path akan commit SEMUA file M/A. Selalu pakai `svn commit file1 file2` secara eksplisit, atau `--changelist`, atau wrapper `.svnci.sh`. |
| `svn merge -c -REV` gagal "Cannot merge into mixed-revision working copy" | Working copy harus di revisi yang sama dengan yang mau di-reverse-merge. Jalankan `svn update` dulu. |
| Reverse merge menghapus file yang di-`svn add` di revisi yang di-undo | Reverse merge dari `svn add` = `svn delete`. Restore dengan `svn copy ^/main/path@REV local_path`. | Cek URL repo dengan `svn info | grep URL` — bisa `^/main` bukan `^/trunk`, path harus persis sama. |
| `Host key verification failed` | For **svn+ssh://** repos, the SVN server SSH host key is not in `~/.ssh/known_hosts`. Run `ssh-keyscan -t ed25519 svn-server-hostname >> ~/.ssh/known_hosts`. |
| `&` in commit message triggers "Foreground command uses '&' backgrounding" | The command processor treats `&` as a shell background operator even inside double-quoted `-m` messages. Avoid `&` entirely — use "dan", "and", or a comma instead. |
| `Working copy is too old` | SVN client version mismatch. Upgrade the client or run `svn upgrade` inside the working copy. |
| Credentials persist across container restarts? | No — `~/.subversion/auth/` is in the home directory. Ensure home directory is mounted persistently (e.g., Docker volume for `/root`). |
| Mixed SVN and Git projects | Keep them in separate directories. Git uses `git remote -v`; SVN uses `svn info`. Don't nest Git repos inside SVN working copies. |

---

## SVN vs Git — Mental Model

| Git | SVN |
|-----|-----|
| Distributed (full local copy) | Centralized (working copy + server) |
| `git clone` | `svn checkout` |
| `git pull` | `svn update` |
| `git commit` (local) then `git push` | `svn commit` (directly to server) |
| `git status` | `svn status` |
| `git log` | `svn log` |
| `git diff` | `svn diff` |
| `.git/` directory | `.svn/` directory in every subfolder |

---

## References

- `references/erzap-svn-setup.md` — Session-specific notes for z4comp SVN servers (erzap/main and erzap_web).
