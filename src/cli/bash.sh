#!/usr/bin/env bash

API_URL="${TICKTICK_API_URL:-https://tick-api.tudominio.dev}"

if [ -z "$1" ]; then
  echo "Usage: tt \"text of the task\""
  exit 1
fi

TEXT="$1"

curl -sS -X POST "${API_URL}/tasks/quick-add" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\"}" > /dev/null

if [ $? -eq 0 ]; then
  echo "Task added ✔"
else
  echo "Error adding task"
fi
