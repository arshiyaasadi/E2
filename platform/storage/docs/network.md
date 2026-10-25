# Storage network

## Zones

| From | To | Purpose |
|---|---|---|
| `file-service` pods | MinIO S3 API (ClusterIP `:9000`) | Presign and proxy object I/O |
| Backup Job | MinIO S3 API | `mc mirror` / replication |
| Ingress / operators | MinIO Console (`:9001`) | Browser Console (OIDC) |
| Apps / storefront | MinIO | **Denied** — use signed URLs or `file-service` only |

## Rules

- Default deny ingress in `platform-storage`.
- Label namespaces that may call S3 with `platform.e2/access-storage=true` (for example the file-service namespace).
- Prefer in-cluster DNS for `file-service` → MinIO; do not expose the S3 API publicly when signed URLs can use an internal or controlled endpoint.
- Console hostname is separate and restricted to operators.
