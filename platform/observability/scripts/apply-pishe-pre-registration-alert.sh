#!/usr/bin/env bash
# Apply the Pishe pre-registration log alert to SigNoz.
# Requires: SIGNOZ_URL (default https://noz.abysso.ir), SIGNOZ_API_KEY
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
RULE="$ROOT/platform/observability/alerts/pishe-pre-registration.rule.json"
URL="${SIGNOZ_URL:-https://noz.abysso.ir}"
URL="${URL%/}"

if [[ -z "${SIGNOZ_API_KEY:-}" ]]; then
  echo "Set SIGNOZ_API_KEY (SigNoz → Settings → API Keys)." >&2
  exit 1
fi

if [[ ! -f "$RULE" ]]; then
  echo "Missing rule file: $RULE" >&2
  exit 1
fi

echo "POST $URL/api/v2/rules …"
curl -sS -X POST "$URL/api/v2/rules" \
  -H "Content-Type: application/json" \
  -H "SIGNOZ-API-KEY: $SIGNOZ_API_KEY" \
  -d @"$RULE"
echo
echo "Done. Check Alert Rules in $URL"
