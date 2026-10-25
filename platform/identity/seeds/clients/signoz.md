# Client for SigNoz (`noz.abysso.ir`)

Confidential OIDC client in the **`operators`** realm. Operators open SigNoz with the same Keycloak identities used for the rest of the platform.

| Field | Value |
|---|---|
| Client id | `signoz` |
| Access type | confidential |
| Standard flow | enabled (Authorization Code + PKCE) |
| Valid redirect URIs | `https://noz.abysso.ir/api/v1/complete/oidc`, `https://noz.abysso.ir/*` |
| Web origins | `https://noz.abysso.ir` |
| Issuer | `https://sso.abysso.ir/realms/operators` |

## Secret

Create the client at deploy time. Store the client secret in the secret manager and mount it into the SigNoz workload as `ABYSSO_OIDC_CLIENT_SECRET` (see `platform/observability/sso/oidc-env.example`). Never commit the secret.

## Role mapping (application side)

Keycloak realm roles → SigNoz roles (implemented in the Abysso SSO overlay / patches):

| Keycloak role | SigNoz role |
|---|---|
| `platform-super-admin` | `ADMIN` |
| `store-owner`, `store-admin` | `EDITOR` |
| `store-editor` | `VIEWER` |

## Signup

With `ABYSSO_DISABLE_SIGNUP=true`, public `/signup` is not used for operators. Bootstrap the first admin via Keycloak, then enforce SSO.

JSON fragment: [signoz.client.json](signoz.client.json). Docs: [platform/observability/docs/sso.md](../../../observability/docs/sso.md).
