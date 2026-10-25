# Identity database

## Engine

PostgreSQL (production-grade). Keycloak built-in `dev-file` / `dev-mem` must not be used outside local experiments.

## Logical resources (placeholders)

| Resource | Placeholder name |
|---|---|
| Database | `keycloak` |
| Database user | `keycloak` |
| Host | `REPLACE_DB_HOST` |
| Port | `5432` |

Credentials live in the secret manager only.

## Ownership

- One logical database and one DB user dedicated to Keycloak.
- No other service reads this database.

## Backup

Owned by the PostgreSQL / backup platform layer, not by the Keycloak process.

- Policy: [docs/operations/database-and-backup.md](../../../docs/operations/database-and-backup.md)
- Component notes: [../docs/backup-restore.md](../docs/backup-restore.md)
- Runbook: [docs/runbooks/restore-identity-database.md](../../../docs/runbooks/restore-identity-database.md)

## Kubernetes

Postgres manifests for identity: see `../deploy/kubernetes/postgres/` and `infrastructure/environments/*/identity/`.
