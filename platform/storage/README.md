# Storage (MinIO)

S3-compatible object storage for the platform.

- **Owner:** TBD
- **Product:** MinIO ([ADR 0005](../../docs/architecture/decisions/0005-minio-object-storage.md))
- **Pinned version:** see [VERSION](VERSION)
- **Business API:** [`services/file-service/`](../../services/file-service/) owns metadata and signed access
- **Console login:** Keycloak OIDC (`operators` realm) — no duplicate staff users

## Layout

```
platform/storage/
├── VERSION
├── buckets/                 Bucket definitions (owner, visibility, lifecycle)
├── oidc/                    MinIO Console ↔ Keycloak notes
├── deploy/kubernetes/       Workloads + network policies
└── docs/                    Deploy, backup, network, console OIDC
```

## Responsibilities

- Private buckets with versioning and lifecycle rules
- Short-lived signed URLs issued by `file-service` (not long-lived keys in apps)
- Replication / mirror for disaster recovery
- MinIO Console for platform operators via Keycloak

## Docs

- [Deploy](docs/deploy.md)
- [Backup and restore](docs/backup-restore.md)
- [Network](docs/network.md)
- [Console OIDC](docs/console-oidc.md)
- Platform: [file storage](../../docs/operations/file-storage.md), [restore object storage](../../docs/runbooks/restore-object-storage.md)
