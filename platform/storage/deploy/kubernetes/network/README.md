# Storage NetworkPolicies

| Policy | Purpose |
|---|---|
| `default-deny-storage` | Deny all ingress |
| `allow-fileservice-to-minio` | Namespaces with `platform.e2/access-storage=true` → S3 API |
| `allow-ingress-to-console` | Ingress namespace → Console |
| `allow-backup-to-minio` | Backup pods → S3 API |

See [docs/network.md](../../../docs/network.md).
