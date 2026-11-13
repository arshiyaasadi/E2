# Alert: Pishe pre-registration

Log-based SigNoz alert that fires when the Pishe BFF emits `pishe.pre_registration`.

Rule payload (API): [../alerts/pishe-pre-registration.rule.json](../alerts/pishe-pre-registration.rule.json).

## Prerequisite: logs must reach SigNoz

Local `yarn workspace pishe dev` only prints JSON to the Next terminal unless OTLP is set:

```bash
# apps/pishe/.env.local — WireGuard only (see otlp-wireguard.yaml)
OTEL_EXPORTER_OTLP_ENDPOINT=http://10.66.0.2:4318
```

Restart the app after setting it. Confirm in SigNoz **Logs** with filter:

`body CONTAINS 'pishe.pre_registration'`

If no rows appear, the alert cannot fire.

## Create in the UI (recommended once)

1. Open `https://noz.abysso.ir` → **Alerts** → **Alert Rules** → **New Alert Rule**.
2. Choose **Logs-based alert**.
3. Filter: `body CONTAINS 'pishe.pre_registration'`
4. Aggregation: `count()`
5. Condition: **Above** `0`, match **at least once**, window **last 5 minutes**, check every **1 minute**.
6. Name: `Pishe pre-registration request`
7. Description: open Logs for `username` / `userId`; approve in Keycloak realm `pishe`.
8. Notification channel: optional (Triggered Alerts still lists firings with no channel).
9. Save.

## Apply via API (optional)

Requires a SigNoz API key with rules write access:

```bash
export SIGNOZ_URL=https://noz.abysso.ir
export SIGNOZ_API_KEY=...   # Settings → API Keys

curl -sS -X POST "$SIGNOZ_URL/api/v2/rules" \
  -H "Content-Type: application/json" \
  -H "SIGNOZ-API-KEY: $SIGNOZ_API_KEY" \
  -d @platform/observability/alerts/pishe-pre-registration.rule.json
```

Or: `yarn workspace` is not used here — from repo root:

```bash
bash platform/observability/scripts/apply-pishe-pre-registration-alert.sh
```

## After it fires

- **Triggered Alerts** tab shows the firing.
- Use **Related Logs** (or Logs Explorer) to read `username`, `firstName`, `lastName`, `userId`.
- Approve in Keycloak Admin → realm **`pishe`** → set password + `pre_registration=false`.
