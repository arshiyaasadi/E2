# SigNoz SSO (Keycloak)

Operators authenticate to `https://noz.abysso.ir` via Keycloak (`operators` realm).

## Why a controlled fork

SigNoz Community Edition does not ship the same OIDC+Keycloak path documented for Enterprise/Cloud. This platform keeps a pinned submodule at `platform/observability/upstream/` and a first-party image (`REGISTRY/signoz:<sha>` / `:main`) with an Abysso SSO overlay. Do **not** copy Enterprise SSO code.

## Pieces

| Piece | Path |
|---|---|
| Source pin | [../VERSION](../VERSION), submodule `upstream/` |
| Image | [../Dockerfile](../Dockerfile), CI `signoz-ci` |
| Overlay hooks | [../sso/](../sso/) |
| Patch policy | [../patches/](../patches/) |
| Keycloak client | [../../identity/seeds/clients/signoz.md](../../identity/seeds/clients/signoz.md) |
| Secret example | [../deploy/kubernetes/signoz-oidc.secret.example.yaml](../deploy/kubernetes/signoz-oidc.secret.example.yaml) |

## Deploy

1. Create Keycloak client `signoz` from the seed (secret in secret manager). Live edge: client + `signoz-oidc` Secret already materialised under `/opt/e2/secrets/signoz-oidc.env`.
2. Ensure CD serves `ghcr.io/arshiyaasadi/signoz:main` (or your `IMAGE_REGISTRY`) and Helm values point the workload at that image.
3. Patch envFrom onto the workload (see `signoz-image-patch.yaml`) so OIDC env is available once the first-party image is live.
4. Keep `ABYSSO_DISABLE_SIGNUP=true` so operators do not use local `/signup`.

## Super-admin access

Realm `operators`, role `platform-super-admin`. User `platform-admin` is assigned that role. Map this role to SigNoz `ADMIN` in the Abysso overlay ([../patches/0001-oidc-keycloak.md](../patches/0001-oidc-keycloak.md)).

## Cookies and `*.abysso.ir`

Keycloak’s **SSO session cookie** is set on **`sso.abysso.ir`** (the IdP host). That is intentional: once you log in at Keycloak, other apps on `*.abysso.ir` that use OIDC redirect get **silent SSO** (no password again) without putting access tokens on the parent domain.

Putting an access token cookie on `Domain=.abysso.ir` is **not** done by Keycloak and is discouraged (XSS on any subdomain could steal it). Prefer:

1. Standard OIDC per app + Keycloak SSO session on `sso.abysso.ir`
2. Optional later: Traefik / oauth2-proxy shared auth cookie if you need a gateway-level session

Session lengths on `operators` (edge): idle 8h, max 24h, access token 15m.

## Upgrade

See [upgrade-from-upstream.md](upgrade-from-upstream.md).
