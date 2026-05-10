#!/bin/bash
# Hermes Agent nightly backup for disaster recovery
# Saves: memories, cron, skills, kanban, gateway, platforms, plugins, config.yaml
# Excludes: secrets, sessions, checkpoints, profiles, logs, cache, bin, trash
#
# USAGE:
# 1. Clone this repo: git clone git@github.com:USER/hermes_log.git ~/.hermes/hermes-log-backup
# 2. Copy to scripts: cp ~/.hermes/hermes-log-backup/backup.sh ~/.hermes/scripts/hermes-backup.sh
# 3. Create cron job via hermes cronjob tool (no_agent=true, script=hermes-backup.sh, schedule="0 3 * * *")

set -e

REPO_DIR="/root/.hermes/hermes-log-backup"
HERMES_DIR="/root/.hermes"
DATE=$(date +%F_%H%M)

cd "$REPO_DIR"

# Pull latest first
git pull origin master 2>/dev/null || true

# Directories to back up (full sync, delete removed files)
DIRS=(
    "memories"
    "cron"
    "skills"
    "kanban"
    "gateway"
    "platforms"
    "plugins"
    "webui-mvp"
    "scripts"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$HERMES_DIR/$dir" ]; then
        mkdir -p "./$dir"
        rsync -a --delete "$HERMES_DIR/$dir/" "./$dir/"
    fi
done

# Config (sanitized — secrets already in env vars, but double-check)
cp "$HERMES_DIR/config.yaml" ./config.yaml

# Remove secrets directory if it was accidentally synced
rm -rf ./secrets 2>/dev/null || true

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
    echo "No changes to backup."
    exit 0
fi

git add -A
git commit -m "backup: $DATE"
git push origin master
echo "Backup pushed: $DATE"
