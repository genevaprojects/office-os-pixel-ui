#!/usr/bin/env bash
set -euo pipefail

REPO="genevaprojects/office-os-pixel-ui"
BRANCH="main"
STATE_FILE="/root/.openclaw/workspace/office_os_pixel_ui/live/state.json"

python3 /root/.openclaw/workspace/office_os_pixel_ui/scripts/build_live_state.py >/dev/null

CONTENT=$(base64 -w 0 "$STATE_FILE")
SHA=$(gh api repos/$REPO/contents/live/state.json --jq '.sha' 2>/dev/null || true)

if [[ -n "${SHA:-}" && "$SHA" != "null" ]]; then
  gh api repos/$REPO/contents/live/state.json \
    --method PUT \
    -f message="chore(live): refresh live dashboard state" \
    -f content="$CONTENT" \
    -f branch="$BRANCH" \
    -f sha="$SHA" >/dev/null
else
  gh api repos/$REPO/contents/live/state.json \
    --method PUT \
    -f message="chore(live): add live dashboard state" \
    -f content="$CONTENT" \
    -f branch="$BRANCH" >/dev/null
fi

echo "Published live/state.json to $REPO@$BRANCH"
