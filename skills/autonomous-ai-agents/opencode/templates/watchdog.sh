#!/usr/bin/env bash
# Template: OpenCode web server watchdog script
# Customize SESSION, PORT, LOG_DIR, OPCODE_PASSWORD, then add to crontab:
#   */5 * * * * /root/.local/bin/ensure-opencode-web.sh
set -euo pipefail

export HOME=/root
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

SESSION="opencode-web"
PORT="32123"
LOG_DIR="/var/log/opencode"
LOG_FILE="$LOG_DIR/watchdog.log"
OPCODE_BIN="$(which opencode)"
OPCODE_PASSWORD="${OPCODE_PASSWORD:-}"  # Set this to password-protect the web UI

mkdir -p "$LOG_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"
}

opencode_healthy() {
  # When password is set, server returns 401 on / — still healthy, so accept 200 or 401
  curl --max-time 5 -fsS -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/" 2>/dev/null | grep -qE '^(200|401)$'
}

start_opencode() {
  log "opencode unhealthy; restarting tmux session ${SESSION}"

  tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true
  pkill -f "opencode serve.*${PORT}" >/dev/null 2>&1 || true

  local launch_cmd="exec '$OPCODE_BIN' serve --port '$PORT' --hostname 127.0.0.1 2>&1 | tee '$LOG_DIR/opencode.log'"
  if [ -n "$OPCODE_PASSWORD" ]; then
    launch_cmd="OPENCODE_SERVER_PASSWORD='$OPCODE_PASSWORD' $launch_cmd"
  fi

  tmux new-session -d -s "$SESSION" -x 160 -y 48 "$launch_cmd"
  log "started tmux session ${SESSION}"

  for _ in 1 2 3 4 5; do
    sleep 2
    if opencode_healthy; then
      log "opencode healthy on port ${PORT}"
      return 0
    fi
  done

  log "opencode still unhealthy after restart; check $LOG_DIR/opencode.log"
  return 1
}

main() {
  if opencode_healthy; then
    exit 0
  fi
  start_opencode
}

main "$@"
