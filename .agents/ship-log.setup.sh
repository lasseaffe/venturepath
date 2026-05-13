#!/usr/bin/env bash
# ONE-TIME SETUP — run once, store the IDs in .env.agents
# Requires: ant CLI  (brew install anthropics/tap/ant)
#           ANTHROPIC_API_KEY env var

set -euo pipefail

echo "Creating environment..."
ENV_ID=$(ant beta:environments create < "$(dirname "$0")/ship-log.environment.yaml" --transform id -r)
echo "ENV_ID=$ENV_ID"

echo "Creating agent..."
AGENT_ID=$(ant beta:agents create < "$(dirname "$0")/ship-log.agent.yaml" --transform id -r)
AGENT_VERSION=$(ant beta:agents retrieve --agent-id "$AGENT_ID" --transform version -r)
echo "AGENT_ID=$AGENT_ID"
echo "AGENT_VERSION=$AGENT_VERSION"

cat > "$(dirname "$0")/.env.agents" <<EOF
VENTUREPATH_SHIP_LOG_AGENT_ID=$AGENT_ID
VENTUREPATH_SHIP_LOG_AGENT_VERSION=$AGENT_VERSION
VENTUREPATH_SHIP_LOG_ENV_ID=$ENV_ID
EOF

echo "Done. IDs saved to .agents/.env.agents"
echo ""
echo "Next: set up a vault with GitHub, Linear, and Notion OAuth credentials,"
echo "then run ship-log.run.sh with VAULT_ID set."
