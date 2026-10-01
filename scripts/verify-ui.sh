#!/usr/bin/env bash
# UI verification pass: boots the dev server, drives agent-browser through
# the redesigned screens, saves screenshots, then shuts the server down.
# Everything in one script because the sandbox reaps background processes
# between tool commands.
set -uo pipefail
cd /home/z/my-project

SHOTS=download/screenshots
mkdir -p "$SHOTS"

echo "== 0. ensure local postgres =="
export LD_LIBRARY_PATH="/home/z/my-project/scripts/pglib:${LD_LIBRARY_PATH:-}"
PGBIN=/home/z/my-project/scripts/pgbin/node_modules/@embedded-postgres/linux-x64/native/bin
if ! $PGBIN/pg_ctl -D .pgdata status >/dev/null 2>&1; then
  $PGBIN/pg_ctl -D .pgdata -o "-p 5432 -c listen_addresses=localhost" -l scripts/pg.log start
  sleep 2
fi
$PGBIN/pg_ctl -D .pgdata status | head -1

echo "== 1. start dev server =="
# The sandbox shell carries a stale exported DATABASE_URL (file:...) that
# Next.js prefers over .env — force the correct local Postgres URL.
export DATABASE_URL="postgres://postgres@localhost:5432/hackmate"
bun run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!

for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/login 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/login)
echo "login http: $code"
[ "$code" = "200" ] || { echo "server did not come up"; tail -20 /tmp/dev.log; kill $DEV_PID 2>/dev/null; exit 1; }

echo "== 2. login hero (ink wash) =="
agent-browser set viewport 1440 900
agent-browser open http://localhost:3000/login
sleep 5
agent-browser screenshot "$SHOTS/login-hero-ink.png"
agent-browser errors --clear 2>/dev/null | head -3

echo "== 3. demo sign-in (via fetch so the session cookie lands) ==="
agent-browser open http://localhost:3000/login >/dev/null 2>&1
sleep 2
agent-browser eval "fetch('/api/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status).catch(e=>'ERR:'+e)" 2>/dev/null | tail -1
sleep 2
agent-browser open http://localhost:3000/ >/dev/null 2>&1
sleep 5
agent-browser screenshot "$SHOTS/discover-ink.png"
agent-browser get url

echo "== 4. hackathons tab + peep window =="
agent-browser open "http://localhost:3000/?tab=hackathons"
sleep 4
agent-browser screenshot "$SHOTS/discover-hackathons-ink.png"
agent-browser find first "[data-slot='card']" hover 2>/dev/null || true
sleep 1
agent-browser screenshot "$SHOTS/hackathon-card-peek.png"

echo "== 5. teams tab + peep window =="
agent-browser open "http://localhost:3000/?tab=teams"
sleep 4
agent-browser find first "[data-slot='card']" hover 2>/dev/null || true
sleep 1
agent-browser screenshot "$SHOTS/team-card-peek.png"

echo "== 6. people tab =="
agent-browser open "http://localhost:3000/?tab=people"
sleep 4
agent-browser screenshot "$SHOTS/discover-people-ink.png"

echo "== 7. profile with GitHub calendar =="
USER_ID=$(agent-browser eval "fetch('/api/users/me').then(r=>r.json()).then(d=>d.user?.id??'none').catch(()=>'none')" 2>/dev/null | tail -1 | tr -d '"')
echo "user id: $USER_ID"
if [ -n "$USER_ID" ] && [ "$USER_ID" != "none" ]; then
  agent-browser open "http://localhost:3000/profile/$USER_ID"
  sleep 7
  agent-browser screenshot "$SHOTS/profile-github-calendar.png" --full
fi

echo "== 8. header closeup (spline emblem) =="
agent-browser open "http://localhost:3000/?tab=hackathons"
sleep 3
agent-browser eval "window.scrollTo(0,0)" >/dev/null 2>&1 || true
sleep 2
agent-browser screenshot "$SHOTS/header-floating-ink.png"

echo "== 9. errors check =="
agent-browser errors 2>&1 | head -8

echo "== 10. done — stop server =="
kill $DEV_PID 2>/dev/null
sleep 2
pkill -f "next dev" 2>/dev/null
echo "complete"
