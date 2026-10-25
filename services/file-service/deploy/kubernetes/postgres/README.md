# file-service PostgreSQL

Provision a dedicated logical database and user for `file-service` per environment.

- Database name: `file_service`
- Owner: `file_service` role (password from secret manager)
- Migrations: `services/file-service/migrations/` run before traffic
- Backup: platform [database and backup](../../../../docs/operations/database-and-backup.md) policy

Manifest sketch may follow `platform/identity/deploy/kubernetes/postgres/` when the cluster database operator is chosen.
