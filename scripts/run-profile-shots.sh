#!/usr/bin/env bash
# Bundled: server up -> profile + my-team screenshots -> server down.
set -uo pipefail
cd /home/z/my-project
export DATABASE_URL="postgres://postgres@127.0.0.1:5432/hackmate"

USER_ID=$(node --input-type=module -e "
import postgres from '/home/z/my-project/node_modules/postgres/src/index.js';
const sql = postgres('postgres://postgres@127.0.0.1:5432/hackmate');
const u = await sql\`select id from \\\"user\\\" where email='dev@hackmate.local' limit 1\`;
console.log(u[0]?.id ?? 'none');
await sql.end();
" 2>/dev/null | tail -1)
echo "user id: $USER_ID"

/home/z/my-project/node_modules/.bin/next start -p 3000 > /home/z/my-project/scripts/next-start.log 2>&1 &
SERVER_PID=$!
sleep 8
curl -s -o /dev/null -w "server: %{http_code}\n" http://127.0.0.1:3000/login --max-time 20

agent-browser set viewport 1440 900

# ensure demo session cookie exists
agent-browser open http://localhost:3000/login
sleep 4
agent-browser eval "fetch('/api/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status).catch(e=>'ERR')" 2>/dev/null | tail -1
sleep 2

if [ -n "$USER_ID" ] && [ "$USER_ID" != "none" ]; then
  agent-browser open "http://localhost:3000/profile/$USER_ID"
  sleep 8
  agent-browser screenshot download/screenshots/profile-embossed.png --full
fi

agent-browser open http://localhost:3000/my-team
sleep 8
agent-browser screenshot download/screenshots/my-team-embossed.png

agent-browser errors 2>/dev/null | head -5 || true

kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null
echo "PROFILE RUN DONE"
