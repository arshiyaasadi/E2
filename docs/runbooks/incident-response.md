# Incident Response

## Severity

| Level | Description | Example |
|---|---|---|
| SEV1 | Platform down or data breach | Gateway unavailable, leaked credentials |
| SEV2 | Major feature unavailable | Checkout failing |
| SEV3 | Degraded, workaround exists | Slow search |

## Steps

1. **Detect:** alert or report.
2. **Declare:** open an incident channel, assign an incident lead.
3. **Mitigate:** rollback, scale, disable a feature, or block traffic. Restore service first, find the root cause later.
4. **Communicate:** regular status updates to stakeholders.
5. **Resolve:** confirm metrics are back to normal.
6. **Review:** blameless post-incident review within a few days, with action items.

## Security incidents

- Rotate any potentially exposed secrets immediately.
- Preserve logs and audit records. Do not delete evidence.
- Revoke affected sessions and tokens through the identity provider.
- Assess whether user data was affected and follow legal notification requirements.

## Post-incident review template

```
## Summary
## Timeline
## Impact
## Root cause
## What went well
## What went wrong
## Action items (owner, due date)
```
