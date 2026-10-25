# Keycloak PostgreSQL (Kubernetes)

Placeholder manifests for a dedicated PostgreSQL cluster serving Keycloak.

- `cluster.yaml` — CloudNativePG-style Cluster sketch (placeholders only)
- Backup and WAL: configure when object storage and credentials exist
- Owner secret: created from the secret manager at deploy time, never committed

Related: [../../database/README.md](../../database/README.md), [../../docs/backup-restore.md](../../docs/backup-restore.md).
