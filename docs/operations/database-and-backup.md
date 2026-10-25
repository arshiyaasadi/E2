# Databases and Backups

## Ownership

- Each service has its own logical database and its own database user.
- A database user has access only to its service's database.
- Cross-service data access happens through APIs or events, never through shared tables.

## Migrations

- Schema changes are versioned migration files in `services/<name>/migrations/`.
- Migrations run as a step of the release, before the new version receives traffic.
- Migrations are backward compatible with the previous service version (expand, then contract), so rollback is possible.
- Destructive changes (drop column, drop table) happen in a later release, after no version uses them.

## High availability

- `production` databases run with at least one replica.
- Automatic or documented manual failover.
- Connection pooling in front of the database.

## Backup policy

| Type | Frequency | Retention | Applies to |
|---|---|---|---|
| Continuous WAL / binlog archiving | Continuous | 7 days | Relational databases (point-in-time recovery) |
| Full snapshot | Daily | 30 days | All databases |
| Full snapshot | Weekly | 12 weeks | All databases |
| Full snapshot | Monthly | 12 months | All databases |
| Object storage replication / versioning | Continuous | 30 days of versions | File storage |

Rules:

- Backups are automated. No manual-only backups.
- Backups are encrypted. The encryption key is stored separately from the backup.
- Backups are stored off-host, in a different location from the database servers.
- Backup jobs report success or failure to the observability stack. A failed backup triggers an alert.

## Recovery targets

| Metric | Target (initial) |
|---|---|
| RPO (max data loss) | 15 minutes |
| RTO (max time to restore) | 4 hours |

These targets are reviewed once real traffic exists.

## Restore rehearsal

- A backup is not considered valid until it has been restored.
- A restore is rehearsed into `staging` at least monthly, and after any change to backup configuration.
- Each rehearsal records: backup used, time taken, data verified, issues found.
- Procedure: [restore database runbook](../runbooks/restore-database.md).
- Identity-specific procedure: [restore identity database](../runbooks/restore-identity-database.md).
- Object storage procedure: [restore object storage](../runbooks/restore-object-storage.md).

## Identity (Keycloak) database

| Item | Value |
|---|---|
| Engine | PostgreSQL |
| Logical database | `keycloak` (per environment) |
| Owner component | `platform/identity` |
| Manifest sketch | `platform/identity/deploy/kubernetes/postgres/` |

Rules:

- Same RPO/RTO and retention as the platform backup policy above.
- Continuous WAL archiving and encrypted off-host snapshots are mandatory before production traffic.
- Keycloak application process does not perform backups; the PostgreSQL / backup layer does.
- Realm JSON seeds under `platform/identity/realms/` rebuild empty configuration only. They do **not** restore users, sessions, or realm keys from production.
- Before a Keycloak version upgrade in production, confirm a valid backup or PITR window.

## file-service database

| Item | Value |
|---|---|
| Engine | PostgreSQL |
| Logical database | `file_service` (per environment) |
| Owner component | `services/file-service` |
| Migrations | `services/file-service/migrations/` |

Rules:

- Same RPO/RTO and retention as the platform backup policy above.
- Object bytes are **not** in this database; restore MinIO separately and keep cuts aligned when possible.

## Object storage (MinIO)

| Item | Value |
|---|---|
| Engine | MinIO (S3-compatible) |
| Owner component | `platform/storage` |
| Content owner API | `services/file-service` |

Rules:

- Versioning + off-cluster replication / `mc mirror` per [platform/storage/docs/backup-restore.md](../../platform/storage/docs/backup-restore.md).
- Retention of object versions: 30 days (see backup policy table above).
