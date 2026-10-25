# Client: `minio-console`

- **Realm:** `operators`
- **Protocol:** openid-connect
- **Access type:** confidential
- **Standard flow:** enabled
- **Direct access grants:** disabled
- **Service accounts:** disabled
- **Valid redirect URIs:** `https://REPLACE_MINIO_CONSOLE_HOSTNAME/oauth_callback`
- **Web origins:** `https://REPLACE_MINIO_CONSOLE_HOSTNAME`
- **Client secret:** secret manager only

## Protocol mappers (recommended)

- Realm roles → token claim `realm_access.roles` (default)
- Group attribute `store_id` is **not** required for Console; Console is for platform operators

## Who may use Console

Prefer users with realm role `platform-super-admin`. Map MinIO policy via OIDC claim after login (see `platform/storage/docs/console-oidc.md`).

Store staff (`store-editor`, etc.) use the ecommerce admin and `file-service` APIs — not MinIO Console.
