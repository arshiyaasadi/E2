# MinIO identity (OIDC)

MinIO Console uses Keycloak as OpenID Connect provider so operators log in with the same accounts as the rest of the platform.

- Client id placeholder: `minio-console` (seed under `platform/identity/`)
- Realm: `operators`
- Details: [docs/console-oidc.md](../docs/console-oidc.md)

Do not provision long-lived MinIO console users for store staff. Application traffic uses S3 credentials held only by `file-service` (from the secret manager).
