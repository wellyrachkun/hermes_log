#!/bin/bash
# Weekly cleanup script — runs every Sunday 4 AM
# Cleans temporary files and caches that are safe to remove

set -e

TOTAL_BEFORE=$(df -h / | tail -1 | awk '{print $3}')
echo "=== Cleanup started: $(date) ==="

# 1. VS Code AI-generated images (temporary screenshots)
echo "[1/7] Cleaning VS Code AI images..."
find /root/projects -name '.vscode-ai-images' -type d -exec rm -rf {} + 2>/dev/null || true
find /root/hermes-workspace -name '.vscode-ai-images' -type d -exec rm -rf {} + 2>/dev/null || true

# 2. Camoufox browser temp
echo "[2/7] Cleaning Camoufox cache..."
rm -rf /root/.cache/camoufox/* 2>/dev/null || true
rm -rf /tmp/camoufox-* 2>/dev/null || true

# 3. Kamal deploy clones
echo "[3/7] Cleaning Kamal clones..."
rm -rf /tmp/kamal-clones 2>/dev/null || true

# 4. Ruby build temp
echo "[4/7] Cleaning Ruby build temp..."
rm -rf /tmp/ruby-build.* 2>/dev/null || true

# 5. Hermes trash
echo "[5/7] Cleaning Hermes trash..."
rm -rf /root/.hermes/trash/* 2>/dev/null || true

# 6. Hermes logs — keep last 2, delete older
echo "[6/7] Rotating Hermes logs..."
find /root/.hermes/logs/ -name '*.log.*' -type f -delete 2>/dev/null || true

# 7. Old node compile cache (>7 days)
echo "[7/7] Cleaning old node compile cache..."
find /tmp/node-compile-cache -type f -mtime +7 -delete 2>/dev/null || true

# Report
TOTAL_AFTER=$(df -h / | tail -1 | awk '{print $3}')
echo "=== Cleanup done: $(date) ==="
echo "Disk before: $TOTAL_BEFORE"
echo "Disk after:  $TOTAL_AFTER"
