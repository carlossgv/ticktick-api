#!/usr/bin/env bash

TICKTICK_API_ENV_FILE=".env"

if [ -f "$TICKTICK_API_ENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$TICKTICK_API_ENV_FILE"
else
  echo "[ERROR] Ticktick API env file not found: $TICKTICK_API_ENV_FILE"
  exit 1
fi

API_URL="${API_URL:-https://tick-api.tudominio.dev}"
echo "Using API URL: $API_URL"

if [ -z "$1" ]; then
  echo "Usage: tt \"text of the task\""
  exit 1
fi


TEXT="$1"

curl -sS -X POST "${API_URL}/tasks/quick-add" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"text\":\"$TEXT\"}" > /dev/null

if [ $? -eq 0 ]; then
  echo "Task added ✔"
else
  echo "Error adding task"
fi
