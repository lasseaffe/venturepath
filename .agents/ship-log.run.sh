#!/usr/bin/env bash
# RUNTIME — run every Friday (or via cron / GitHub Actions)
# Requires: ant CLI, ANTHROPIC_API_KEY, VAULT_ID env var

set -euo pipefail

SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/.env.agents"

: "${VAULT_ID:?Set VAULT_ID to your vault containing GitHub/Linear/Notion credentials}"

TODAY=$(date +%Y-%m-%d)
echo "Running VenturePath ship log for week ending $TODAY..."

SESSION_ID=$(ant beta:sessions create \
  --agent "$VENTUREPATH_SHIP_LOG_AGENT_ID" \
  --environment-id "$VENTUREPATH_SHIP_LOG_ENV_ID" \
  --title "VenturePath Ship Log $TODAY" \
  --vault-ids "[\"$VAULT_ID\"]" \
  --transform id -r)

echo "Session: $SESSION_ID"

exec {stream}< <(ant beta:sessions:events stream --session-id "$SESSION_ID" \
  --transform '{type,text:content.#(type=="text").text}' --format yaml)

ant beta:sessions:events send --session-id "$SESSION_ID" > /dev/null <<YAML
events:
  - type: user.message
    content:
      - type: text
        text: >
          Generate the weekly ship log for VenturePath for the 7 days ending today ($TODAY).
          Pull all GitHub commits and merged PRs, all Linear tickets moved to Done,
          then create the Notion page as specified. Go.
YAML

while IFS= read -r -u "$stream" line; do
  case "$line" in
    type:\ session.status_idle|type:\ session.status_terminated) break ;;
    text:*)
      val="${line#text: }"
      case "$val" in '|-'|'|'|null) ;; *) printf '%s\n' "$val" ;; esac ;;
  esac
done
exec {stream}<&-

echo ""
echo "Done. Check Notion for the new page."
