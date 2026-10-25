# Restore Database

## When to use

- Data loss or corruption in `production`
- Scheduled restore rehearsal in `staging`

## Prerequisites

- Access to the backup storage and the backup encryption key
- Target database server with enough capacity
- Approval from the service owner (for `production`)

## Steps

1. Decide the recovery point (latest, or a specific time before the incident).
2. Stop writes to the affected database (scale the service down or enable maintenance mode).
3. Restore into a **new** database instance. Never overwrite the existing one first.
4. Apply archived logs up to the chosen recovery point (point-in-time recovery).
5. Verify data (row counts, latest records, integrity checks, service-specific checks).
6. Point the service to the restored database.
7. Re-enable writes and scale the service back up.
8. Keep the old database instance until the restore is confirmed, then archive or remove it.

## Verification

- Service readiness passes.
- Service-specific data checks pass.
- No errors in logs related to data access.

## Escalation

Platform owner and service owner. For data loss affecting users, follow [incident response](incident-response.md).

## Rehearsal log

| Date | Who | Database | Backup used | Duration | Result | Notes |
|---|---|---|---|---|---|---|
