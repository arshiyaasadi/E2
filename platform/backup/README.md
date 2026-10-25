# Backup

Backup and restore for databases and object storage.

## Responsibilities

- Continuous log archiving for point-in-time recovery
- Daily, weekly, and monthly snapshots with retention
- Encryption of backups, with keys stored separately
- Off-host and off-site backup storage
- Backup job success and failure reporting
- Restore tooling and monthly rehearsal

## Planned contents

- `policies/`: schedule and retention per data store
- `docs/`: tool choice (ADR link) and rehearsal results summary

Design reference: [databases and backups](../../docs/operations/database-and-backup.md). Procedure: [restore database runbook](../../docs/runbooks/restore-database.md).
