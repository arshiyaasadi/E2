# MinIO Console OIDC (Keycloak)

## Goal

Operators open MinIO Console with the same Keycloak user as other platform tools. No duplicate staff accounts in MinIO.

## Keycloak

- Realm: `operators`
- Client id: `minio-console` (confidential; secret in secret manager)
- Valid redirect URI: `https://REPLACE_MINIO_CONSOLE_HOSTNAME/oauth_callback`
- Scopes: `openid`, `profile`, `email`
- Roles: map `platform-super-admin` (and optional console policy groups) via MinIO claim policies

Seed notes: `platform/identity/seeds/` and client fragment docs under identity.

## MinIO

Configure OpenID (example env / config — values from secret manager):

| Setting | Placeholder |
|---|---|
| Config URL | `REPLACE_KEYCLOAK_OPERATORS_ISSUER/.well-known/openid-configuration` |
| Client ID | `minio-console` |
| Client Secret | from secret manager |
| Claim name | `preferred_username` or `sub` |
| Redirect URI | Console `/oauth_callback` |
| Display name | `Keycloak` |

## Verification

1. Open Console URL → redirected to Keycloak login.
2. Log in as a `platform-super-admin` test user.
3. Land in Console without a local MinIO user prompt.
4. Confirm store staff without Console policy cannot administer buckets (application uploads still go through `file-service`).
