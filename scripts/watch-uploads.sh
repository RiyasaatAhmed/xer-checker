#!/usr/bin/env bash
# Follow an upload live in tmux, from the browser to the database. Run it from anywhere while `docker compose up` runs.
#
#   scripts/watch-uploads.sh       open the session (it replaces an older one)
#   Ctrl-b d                       leave it running in the background
#   tmux attach -t xer-uploads     come back to it
#   tmux kill-session -t xer-uploads   stop it
#
# 3 panes, in the order an upload passes through them:
#   1. Browser to nginx: the frontend container's access log (the page, then POST /api/uploads)
#   2. Backend: each upload's stages (1/3 received, 2/3 checked, 3/3 saved) and every API request
#   3. Database: the 5 newest uploads, with the rows saved for each, every 2 seconds

set -euo pipefail

# ---------- Constants ----------

SESSION="xer-uploads"  # the tmux session's name
REFRESH=2              # seconds between database refreshes
RECENT=5               # uploads the database pane shows
ROOT="$(cd "$(dirname "$0")/.." && pwd)"  # the repo root, where docker-compose.yml is

QUERY="SELECT to_char(u.created_at, 'HH24:MI:SS') AS at, u.file_name AS file, u.status,
  (SELECT count(*) FROM metric_results m WHERE m.upload_id = u.id) AS checks,
  (SELECT count(*) FROM activities a WHERE a.upload_id = u.id) AS activities,
  (SELECT count(*) FROM relationships r WHERE r.upload_id = u.id) AS links,
  left(coalesce(u.failure_reason, ''), 40) AS why_failed
FROM uploads u ORDER BY u.created_at DESC LIMIT $RECENT;"

# The database pane runs this script again with --database: the query then needs no nested quotes.
if [ "${1:-}" = "--database" ]; then
  cd "$ROOT"
  while true; do
    clear
    echo "The $RECENT newest uploads, every ${REFRESH}s. Times are UTC."
    docker compose exec -T database sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<< "$QUERY" || echo "Can't reach the database."
    sleep "$REFRESH"
  done
fi

if ! docker compose -f "$ROOT/docker-compose.yml" ps --status running --services | grep -qx backend; then
  echo "The app isn't running. Start it first, from the repo root: docker compose up --build -d" >&2
  exit 1
fi

tmux kill-session -t "$SESSION" 2>/dev/null || true
cd "$ROOT"

# Pane 1, top: the backend. Panes 2 and 3 split the bottom: nginx on the left, the database on the right.
tmux new-session -d -s "$SESSION" -x 220 -y 60 -n uploads "docker compose logs -f --tail 20 backend"
tmux split-window -v -t "$SESSION":uploads -l 40% "docker compose logs -f --tail 10 frontend"
tmux split-window -h -t "$SESSION":uploads.1 "\"$ROOT/scripts/watch-uploads.sh\" --database"

tmux select-pane -t "$SESSION":uploads.0 -T "2. Backend: received, checked, saved"
tmux select-pane -t "$SESSION":uploads.1 -T "1. Browser to nginx"
tmux select-pane -t "$SESSION":uploads.2 -T "3. Database: the newest uploads"
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{pane_title} "
tmux set-option -t "$SESSION" mouse on  # click a pane, scroll its log

if [ -t 1 ]; then
  if [ -n "${TMUX:-}" ]; then tmux switch-client -t "$SESSION"; else tmux attach -t "$SESSION"; fi
else
  echo "Started tmux session '$SESSION'. Open it with: tmux attach -t $SESSION"
fi
