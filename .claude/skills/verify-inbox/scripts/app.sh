#!/usr/bin/env bash
# The Inbox's verify harness. See ../SKILL.md. Touches only what it started.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
plugin=$(cd "$here/../../../.." && pwd)
repo=${SHIPYARD_REPO:-$HOME/work/berthd}
ref=${SHIPYARD_REF:-fork/stener}
port=${INBOX_PORT:-1433}
app=${INBOX_APP_DIR:-/tmp/inbox-app}
pidf=/tmp/inbox-app-preview.pid
drive="$app/.claude/skills/verify-berthd/scripts/drive.mjs"
devbox="$app/.claude/skills/verify-berthd/scripts/dev-box.sh"
export VERIFY_BOX_DIR=${VERIFY_BOX_DIR:-/tmp/vb-inbox}
taken() { ss -ltn | grep -q ":$1 "; }
scenario() { echo "$here/scenarios/$1.mjs"; }
out() { echo "/tmp/inbox-ev/$1-$(date +%H%M%S)"; }

case "${1:-}" in
  up)
    taken "$port" && { echo "port $port is taken" >&2; exit 1; }
    (cd "$plugin" && pnpm install --silent && pnpm -s build)
    [ -d "$app" ] || git -C "$repo" worktree add -q --detach "$app" "$ref"
    (cd "$app/app" && CI=true pnpm install --frozen-lockfile --silent && pnpm build >/dev/null)
    cd "$app/app"
    nohup node_modules/.bin/vite preview --host 0.0.0.0 --port "$port" --strictPort >/tmp/inbox-app-preview.log 2>&1 &
    echo $! >"$pidf"
    until curl -sf "http://localhost:$port/" >/dev/null; do sleep 0.5; done
    echo "ready: http://localhost:$port/?mock=1"
    ;;
  doctor)
    curl -sf "http://localhost:$port/" >/dev/null && echo "port $port answers" || { echo "port $port doesn't answer"; exit 1; }
    pid=$(cat "$pidf" 2>/dev/null || true)
    ss -ltnp | grep ":$port " | grep -q "pid=$pid," && echo "the listener is ours ($pid)" || { echo "the listener isn't ours: don't drive it"; exit 1; }
    [ -z "$(find "$plugin/src" -newer "$plugin/dist/index.js" -type f | head -1)" ] && echo "dist is current" || { echo "dist is older than src: pnpm build"; exit 1; }
    ;;
  drive)
    (cd "$plugin" && pnpm -s build)
    (cd "$app" && node "$drive" "$(scenario "$2")" --port "$port" --out "$(out "$2")")
    ;;
  box-up)
    for p in 7544 9377 9378; do taken "$p" && { echo "port $p is taken: another dev box is running, wait for it" >&2; exit 1; }; done
    (cd "$app" && timeout 400 "$devbox" up || true)
    eval "$("$devbox" env)"
    # A fresh folder stops at Claude's trust prompt. Accept it once in a throwaway session.
    tm() { env TMUX_TMPDIR="$VERIFY_BOX_DIR/tmux" tmux -L berth "$@"; }
    api=http://127.0.0.1:9378/v1/boxes/devq/api
    curl -s -X PUT -H "Authorization: Bearer $VERIFY_BERTH_TOKEN" -H 'Content-Type: application/json' "$api/agents/defaults" -d '{"structured":false,"mode":"bypassPermissions"}' >/dev/null
    curl -s -X POST -H "Authorization: Bearer $VERIFY_BERTH_TOKEN" -H 'Content-Type: application/json' "$api/sessions" -d '{"location":"acme-shop","name":"trust","agent":"claude"}' >/dev/null
    for _ in $(seq 1 30); do tm capture-pane -p -t trust 2>/dev/null | grep -q 'trust this folder' && break; sleep 1; done
    if tm capture-pane -p -t trust 2>/dev/null | grep -q 'trust this folder'; then tm send-keys -t trust Down; sleep 1; tm send-keys -t trust Enter; sleep 5; fi
    for s in trust ask; do curl -s -X DELETE -H "Authorization: Bearer $VERIFY_BERTH_TOKEN" "$api/sessions/$s" >/dev/null || true; done
    echo "dev box ready"
    ;;
  drive-live)
    (cd "$plugin" && pnpm -s build)
    eval "$("$devbox" env)"
    (cd "$app" && node "$drive" "$(scenario "$2")" --port "$port" --agent http://127.0.0.1:9378 --out "$(out "$2-${VERIFY_INBOX_DRIVER:-terminal}")")
    ;;
  box-down)
    (cd "$app" && "$devbox" down)
    sleep 3
    rm -rf "$VERIFY_BOX_DIR"
    ;;
  down)
    pid=$(cat "$pidf" 2>/dev/null || true)
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    rm -f "$pidf"
    [ -d "$app" ] && git -C "$repo" worktree remove --force "$app"
    echo stopped
    ;;
  *)
    echo "usage: app.sh up|doctor|drive SCENARIO|box-up|drive-live SCENARIO|box-down|down" >&2
    exit 2
    ;;
esac
