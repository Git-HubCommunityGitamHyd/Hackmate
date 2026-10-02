#!/usr/bin/env bash
# UI verification, round 4 — debossed system + ray-traced login + logo swap.
# Server (next start) is expected ALREADY RUNNING on :3000 (started by caller).
set -uo pipefail
cd /home/z/my-project

SHOTS=download/screenshots
mkdir -p "$SHOTS"

agent-browser set viewport 1440 900

echo "== 1. login — ray field at resting position =="
agent-browser open http://localhost:3000/login
sleep 6
agent-browser screenshot "$SHOTS/login-ray-rest.png"

echo "== 2. login — light moved to far LEFT (card shadow should swing RIGHT) =="
agent-browser eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:60,clientY:260,pointerType:'mouse',bubbles:true})); 'ok'" 2>/dev/null | tail -1
sleep 2
agent-browser screenshot "$SHOTS/login-ray-left.png"

echo "== 3. login — light moved to far RIGHT (shadow swings LEFT) =="
agent-browser eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:1380,clientY:400,pointerType:'mouse',bubbles:true})); 'ok'" 2>/dev/null | tail -1
sleep 2
agent-browser screenshot "$SHOTS/login-ray-right.png"

echo "== 4. demo sign-in =="
agent-browser eval "fetch('/api/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status).catch(e=>'ERR:'+e)" 2>/dev/null | tail -1
sleep 2

echo "== 5. discover — debossed cards, nav wells, debossed footer =="
agent-browser open http://localhost:3000/
sleep 6
agent-browser screenshot "$SHOTS/discover-debossed.png"

echo "== 6. header closeup =="
agent-browser eval "window.scrollTo(0,0)" >/dev/null 2>&1 || true
sleep 1
agent-browser screenshot "$SHOTS/header-logo-wells.png"

echo "== 7. hackathons tab + card hover (peek + pointer bloom) =="
agent-browser open "http://localhost:3000/?tab=hackathons"
sleep 5
agent-browser find first "[data-slot='card']" hover 2>/dev/null || true
sleep 1
agent-browser screenshot "$SHOTS/hackathons-debossed-peek.png"

echo "== 8. profile page (logo + debossed panes) =="
USER_ID=$(agent-browser eval "fetch('/api/users/me').then(r=>r.json()).then(d=>d.user?.id??'none').catch(()=>'none')" 2>/dev/null | tail -1 | tr -d '"')
echo "user id: $USER_ID"
if [ -n "$USER_ID" ] && [ "$USER_ID" != "none" ]; then
  agent-browser open "http://localhost:3000/profile/$USER_ID"
  sleep 7
  agent-browser screenshot "$SHOTS/profile-debossed.png" --full
fi

echo "== 9. console errors =="
agent-browser errors 2>/dev/null | head -5 || true

echo "DONE"
