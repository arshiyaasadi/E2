# Client seed fragments (operators realm)

These documents describe OIDC clients related to file storage. Create clients at bootstrap from the secret manager; do **not** commit client secrets.

| Client id | Type | Purpose |
|---|---|---|
| `minio-console` | Confidential | MinIO Console browser login via Keycloak |
| `file-service` | Bearer-only / resource | Audience for API tokens |
| `svc-store-backend` | Confidential + service account | Primary M2M caller of file-service |
| `file-service-api` | Confidential (optional) | Extra machine client for jobs/batch |
| `signoz` | Confidential | SigNoz UI (`noz.abysso.ir`) OIDC login |

Apply by merging into `operators` after first realm import, or extend the realm import Job. See [minio-console.md](minio-console.md), [file-service.md](file-service.md), [svc-store-backend.md](svc-store-backend.md), and [signoz.md](signoz.md).

Realm roles used by file-service callers: `file-service-caller`, optional `file-service-admin`.
