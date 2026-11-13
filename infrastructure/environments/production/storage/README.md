# Production storage overlay

- **S3 API:** ClusterIP `minio.platform-storage.svc:9000` (SeaweedFS S3; used by `file-service`)
- **Operator UI:** `https://file.abysso.ir` → oauth2-proxy → console `:9333`
- **SSO:** Keycloak client `minio-console` (same pattern as `noz.abysso.ir`)

## Secrets

Materialize on the node:

- `minio-secrets` / `minio-s3-config` (S3 credentials for file-service)
- `file-console-oidc` from `/opt/e2/secrets/file-console-oidc.env` (oauth2-proxy client + cookie secret)

## Keycloak

Client `minio-console`:

- Redirect URI: `https://file.abysso.ir/oauth2/callback`
- Web origin: `https://file.abysso.ir`
- Allowed role on proxy: `platform-super-admin`

## Note on MinIO images

Official `minio/minio` images are not pullable on this edge network. The workload name stays `minio` for Service/DNS stability; the engine is SeaweedFS until a private MinIO image mirror exists.
