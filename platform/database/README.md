# Database

Database engines and the conventions for provisioning per-service databases.

## Responsibilities

- Database engine deployment with replicas
- Per-service database and user provisioning
- Connection pooling
- Encryption at rest
- Migration conventions (migrations themselves live in each service)

## Planned contents

- `provisioning/`: database and user definitions per service
- `docs/`: engine choice (ADR link), high availability, and failover notes

Design reference: [databases and backups](../../docs/operations/database-and-backup.md).
