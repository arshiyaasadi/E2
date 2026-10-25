# Client seed fragments (operators realm)

These documents describe OIDC clients related to file storage. Create clients at bootstrap from the secret manager; do **not** commit client secrets.

| Client id | Type | Purpose |
|---|---|---|
| `minio-console` | Confidential | MinIO Console browser login via Keycloak |
| `file-service` | Bearer-only / resource or confidential machine | Audience for API tokens; optional client-credentials for jobs |
| `file-service-api` | Confidential (optional) | Machine client if a backend calls file-service without a user |

Apply by merging into `operators` after first realm import, or extend the realm import Job. See [minio-console.md](minio-console.md) and [file-service.md](file-service.md).
