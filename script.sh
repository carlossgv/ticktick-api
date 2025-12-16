#!/usr/bin/env bash
set -euo pipefail

TICKTICK_API_ENV_FILE="./.env"

if [ -f "$TICKTICK_API_ENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$TICKTICK_API_ENV_FILE"
else
  echo "[ERROR] Ticktick API env file not found: $TICKTICK_API_ENV_FILE"
  exit 1
fi

API_URL="${API_URL:-https://tick-api.tudominio.dev}"

DRY_RUN="false"

# ───────────────────────────
# Flags
# ───────────────────────────
if [ "${1:-}" = "--dry-run" ] || [ "${1:-}" = "-n" ]; then
  DRY_RUN="true"
  shift
fi

if [ -z "${1:-}" ]; then
  echo "Usage: tt [--dry-run|-n] \"text of the task\""
  exit 1
fi

TEXT="$1"
export TEXT

# ───────────────────────────
# Safe JSON encode
# ───────────────────────────
JSON_BODY="$(python3 - <<'PY'
import json, os
print(json.dumps({"text": os.environ["TEXT"]}))
PY
)"

URL="${API_URL}/tasks/quick-add"
if [ "$DRY_RUN" = "true" ]; then
  URL="${URL}?dryRun=true"
fi

# ───────────────────────────
# Request (capture body + status)
# ───────────────────────────
RESP="$(curl -sS -w '\n%{http_code}' -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$JSON_BODY")"

BODY="$(echo "$RESP" | sed '$d')"
STATUS="$(echo "$RESP" | tail -n1)"

# ───────────────────────────
# Handle response
# ───────────────────────────
if [ "$STATUS" -ge 400 ]; then
  echo "Error adding task:"
  echo "$BODY"
  exit 1
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "$BODY"
  exit 0
fi

echo "Task added ✔"
