# Restore Identity Database

## When to use

- Data loss or corruption in the Keycloak PostgreSQL database
- Scheduled restore rehearsal for identity in `staging`
- Recovery before or after a failed Keycloak upgrade that damaged data

## Prerequisites

- Access to identity backup storage and the backup encryption key
- Target PostgreSQL capacity for a new cluster/instance
- Approval from the identity / platform owner (for `production`)
- Ability to scale Keycloak down or enable maintenance mode

## Steps

1. Decide the recovery point (latest, or a specific time before the incident).
2. Stop writes: scale Keycloak Deployment to 0 or block traffic at Ingress.
3. Restore into a **new** PostgreSQL instance or CloudNativePG cluster. Do not overwrite the live volume first.
4. Apply WAL up to the chosen recovery point (PITR) when required.
5. Verify: Keycloak schema present; sample realm rows; admin can start against the restored DB.
6. Point Keycloak at the restored database (update Secret / ConfigMap host if needed).
7. Scale Keycloak back up; confirm `/health/ready` and login for `customers` and `operators`.
8. Keep the old database until verification succeeds, then archive or remove it.
9. Do **not** re-run realm seed import over restored production data.

## Verification

- Keycloak readiness passes on all replicas.
- OIDC discovery endpoints respond for both realms.
- Operator and customer login smoke tests pass (staging) or limited production checks pass.
- Backup jobs resume successfully after restore.

## Escalation

Platform owner. If authentication is fully unavailable, follow [incident response](incident-response.md) as SEV1/SEV2.

## Seeds vs restore

| Mechanism | Restores users and keys? | Use when |
|---|---|---|
| Database backup / PITR | Yes | Real recovery |
| Realm JSON seeds | No | Empty environment bootstrap only |

## Rehearsal log

| Date | Who | Environment | Backup used | Duration | Result | Notes |
|---|---|---|---|---|---|---|
