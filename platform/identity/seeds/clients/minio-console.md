# Client: `minio-console`

OIDC browser login for the object-store console at `https://file.abysso.ir` (oauth2-proxy), same SSO pattern as SigNoz (`noz.abysso.ir`).

| Field | Value |
|---|---|
| Realm | `operators` |
| Client id | `minio-console` |
| Access type | confidential |
| Standard flow | enabled |
| Valid redirect URIs | `https://file.abysso.ir/oauth2/callback`, `https://file.abysso.ir/*` |
| Web origins | `https://file.abysso.ir` |
| Client secret | secret manager → `file-console-oidc` / oauth2-proxy |

## Who may use Console

Users with realm role `platform-super-admin` (enforced by oauth2-proxy `--allowed-role`).

Store staff use ecommerce admin + `file-service` (M2M) — not this console.
