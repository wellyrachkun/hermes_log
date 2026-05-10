#!/bin/bash
# Hermes Agent nightly backup for disaster recovery
# Excludes: secrets, sessions, checkpoints, profiles, logs, cache, bin

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
