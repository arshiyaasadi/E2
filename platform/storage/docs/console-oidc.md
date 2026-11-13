# Object-store Console SSO (Keycloak)

## Goal

Operators open `https://file.abysso.ir` and authenticate with Keycloak (`operators` realm), same SSO idea as SigNoz on `noz.abysso.ir`.

## Architecture (edge)

| Layer | Component |
|---|---|
| Public host | `file.abysso.ir` (Traefik Ingress) |
| Auth gate | `file-console-auth` (oauth2-proxy, Keycloak OIDC) |
| Console UI | SeaweedFS master UI on `minio:9333` |
| S3 API | SeaweedFS on `minio:9000` (ClusterIP only) |

Official MinIO Console is deferred until a pullable MinIO image is mirrored privately.

## Keycloak

- Realm: `operators`
- Client id: `minio-console` (confidential)
- Redirect URI: `https://file.abysso.ir/oauth2/callback`
- Web origin: `https://file.abysso.ir`
- Role required by proxy: `platform-super-admin`

Secret: `/opt/e2/secrets/file-console-oidc.env` → K8s Secret `file-console-oidc`.

## oauth2-proxy notes

Keycloak access tokens often have `aud: account`. Set `--oidc-extra-audience=account` so callback does not 500 with “audience … does not match”.

## Verification

1. Open `https://file.abysso.ir` (fresh tab) → 302 to `sso.abysso.ir`.
2. Log in as a user with `platform-super-admin` (and an email on the account).
3. Land on the storage console UI.
4. Confirm `file-service` still reaches S3 on ClusterIP (health ready).

Do not reuse an old `/oauth2/callback?code=…` URL after a proxy restart; start again from `/`.
