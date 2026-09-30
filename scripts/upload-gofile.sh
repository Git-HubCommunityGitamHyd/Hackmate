#!/usr/bin/env bash
# Uploads a file to gofile.io via their public API and prints the share link.
# Usage: bash upload-gofile.sh [path-to-file]
set -uo pipefail

FILE="${1:-/home/z/my-project/download/hackmate.zip}"
[ -f "$FILE" ] || { echo "ERROR: file not found: $FILE"; exit 1; }

fetch() { # fetch <url> [extra curl args...] — retries transient network blips
  local url="$1"; shift
  local out=""
  for i in 1 2 3 4 5; do
    out=$(curl -s --max-time 30 "$@" "$url" 2>/dev/null) && [ -n "$out" ] && { printf '%s' "$out"; return 0; }
    echo "  (retry $i for $url)" >&2
    sleep 3
  done
  return 1
}

echo "== step 1: pick an upload server =="
SERVERS_JSON=$(fetch https://api.gofile.io/servers) || { echo "ERROR: servers endpoint unreachable"; exit 1; }
SERVER=$(printf '%s' "$SERVERS_JSON" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
servers = d.get("data", {}).get("servers", []) or []
for s in servers:
    print(s.get("name") if isinstance(s, dict) else s)
    break
' 2>/dev/null | head -1)
[ -n "${SERVER:-}" ] || { echo "ERROR: could not pick a server. Response: $SERVERS_JSON"; exit 1; }
echo "server: $SERVER"

echo "== step 2: guest token =="
ACCOUNT_JSON=$(fetch https://api.gofile.io/accounts -X POST -H "Content-Type: application/json" -d '{}') || ACCOUNT_JSON=""
TOKEN=$(printf '%s' "$ACCOUNT_JSON" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("data", {}).get("token", ""))
except Exception:
    print("")
' 2>/dev/null)
if [ -n "${TOKEN:-}" ]; then
  echo "token: ${TOKEN:0:10}..."
else
  echo "no token returned, falling back to anonymous upload"
fi

echo "== step 3: upload ($(du -h "$FILE" | cut -f1)) =="
if [ -n "${TOKEN:-}" ]; then
  URL="https://${SERVER}.gofile.io/contents/uploadfile?token=${TOKEN}"
else
  URL="https://${SERVER}.gofile.io/contents/uploadfile"
fi
UPLOAD_JSON=$(fetch "$URL" --max-time 600 -F "file=@${FILE}") || { echo "ERROR: upload request failed"; exit 1; }

printf '%s' "$UPLOAD_JSON" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception as e:
    print("ERROR: non-JSON response: " + str(e)); sys.exit(1)
if d.get("status") != "ok":
    print("ERROR: upload failed: " + json.dumps(d)[:500]); sys.exit(1)
data = d.get("data", {})
print("")
print("downloadPage: " + data.get("downloadPage", ""))
print("directUrl:    " + data.get("downloadUrl", ""))
print("fileId:       " + data.get("id", ""))
print("guestToken:   " + data.get("guestToken", ""))
'
