#!/usr/bin/env bash
# Bundled runner: starts the server, runs UI verification + pentest in the
# SAME process session (the sandbox reaps detached processes between tool
# calls, so the server must not outlive this script).
set -uo pipefail
cd /home/z/my-project

export DATABASE_URL="postgres://postgres@127.0.0.1:5432/hackmate"

echo "=== starting next start :3000 ==="
/home/z/my-project/node_modules/.bin/next start -p 3000 > /home/z/my-project/scripts/next-start.log 2>&1 &
SERVER_PID=$!
sleep 8

if ! curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login --max-time 20 | grep -q 200; then
  echo "SERVER FAILED TO START"; cat scripts/next-start.log; kill $SERVER_PID 2>/dev/null; exit 1
fi
echo "server up (pid $SERVER_PID)"

echo "=== UI verification round 5 ==="
bash scripts/verify-ui-r5.sh 2>&1 | grep -v "^$" | tail -30

echo "=== pentest ==="
python3 scripts/pentest/pentest.py 2>&1 | tail -12

echo "=== api-verify ==="
python3 scripts/pentest/api-verify.py 2>&1 | tail -6

echo "=== stopping server ==="
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "BUNDLED RUN DONE"
