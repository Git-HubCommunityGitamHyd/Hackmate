#!/usr/bin/env bash
# Round 7 screenshots: fluted wall + hard-surface deboss + 10px frost +
# grain-gradient hero + login-only pixel wake + full-card peek.
set -uo pipefail
cd /home/z/my-project

OUT=download/screenshots
mkdir -p "$OUT"

agent-browser set viewport 1440 900

# ---- 1. Login: hero + grain gradient + frosted sign-in card ----
agent-browser open http://localhost:3000/login
sleep 6
agent-browser screenshot $OUT/r7-login.png --full

# ---- 2. Login with pixel wake: sweep the mouse across the hero ----
agent-browser move 300 400
sleep 1
agent-browser move 500 500
sleep 1
agent-browser move 700 350
sleep 1
agent-browser screenshot $OUT/r7-login-pixel-wake.png

# ---- 3. Demo session for the authenticated pages ----
agent-browser eval "fetch('/api/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status).catch(e=>'ERR')" 2>/dev/null | tail -1
sleep 2

# ---- 4. Discover: the fluted wall + debossed frosted cards ----
agent-browser open http://localhost:3000/
sleep 8
agent-browser screenshot $OUT/r7-discover.png --full

# ---- 5. Peek: hover a hackathon card - the hub window covers the card ----
agent-browser move 720 500
sleep 1.2
agent-browser screenshot $OUT/r7-peek-open.png

# ---- 6. People tab ----
agent-browser open http://localhost:3000/
sleep 4
agent-browser eval "document.querySelectorAll('[data-slot=\"tabs-trigger\"]')[1] ? document.querySelectorAll('[data-slot=\"tabs-trigger\"]')[1].click() : 'no-tabs'" 2>/dev/null | tail -1
sleep 3
agent-browser screenshot $OUT/r7-discover-people.png

# ---- 7. My team workspace ----
agent-browser open http://localhost:3000/my-team
sleep 8
agent-browser screenshot $OUT/r7-my-team.png

# ---- 8. Hackathon hub detail ----
agent-browser open "http://localhost:3000/hackathons/smart-india-hackathon"
sleep 8
agent-browser screenshot $OUT/r7-hackathon-detail.png --full

# ---- 9. Footer: floating tray, no dotted line ----
agent-browser open http://localhost:3000/saved
sleep 6
agent-browser eval "window.scrollTo(0, document.body.scrollHeight)" 2>/dev/null | tail -1
sleep 2
agent-browser screenshot $OUT/r7-footer.png

# ---- 10. Emergency page (sort + wall consistency) ----
agent-browser open http://localhost:3000/emergency
sleep 6
agent-browser screenshot $OUT/r7-emergency.png

agent-browser errors 2>/dev/null | head -8 || true
echo "shots done"
