# 0001. Thin OIDC against Keycloak (CE-safe)

## Intent

Operators authenticate to `https://noz.abysso.ir` using Keycloak (`https://sso.abysso.ir/realms/operators`), not SigNoz local signup.

Official SigNoz OIDC+Keycloak documentation targets Enterprise/Cloud. This platform implements a **first-party** adapter (env + entrypoint + future submodule commits on `abysso/sso`) without importing Enterprise code.

## Env contract

See [../sso/oidc-env.example](../sso/oidc-env.example):

- `ABYSSO_OIDC_ENABLED=true`
- `ABYSSO_OIDC_ISSUER=https://sso.abysso.ir/realms/operators`
- `ABYSSO_OIDC_CLIENT_ID=signoz`
- `ABYSSO_OIDC_CLIENT_SECRET` from secret manager
- `ABYSSO_OIDC_REDIRECT_URI=https://noz.abysso.ir/api/v1/complete/oidc`
- `ABYSSO_DISABLE_SIGNUP=true`

## Keycloak client

Seed: [../../identity/seeds/clients/signoz.md](../../identity/seeds/clients/signoz.md).

## Implementation stages

1. **Image channel** — first-party `signoz` image with [../sso/entrypoint-abysso.sh](../sso/entrypoint-abysso.sh) exporting the env contract (done in CI).
2. **Auth bridge (live)** — [../sso/auth-bridge/auth_bridge.py](../sso/auth-bridge/auth_bridge.py) in front of SigNoz. Ingress targets `signoz-auth-bridge`. Authorization Code + PKCE against Keycloak; mints SigNoz JWTs; `/signup` and `/login` redirect to SSO; public register returns 403 when signup is disabled.
3. **Optional submodule commits** — deeper in-tree OIDC on `abysso/sso` can replace the bridge later.
4. **Cutover** — Helm/CD uses `REGISTRY/signoz:main`; Secret mounts OIDC env; Ingress → auth-bridge.

## Verification

- Login redirects to Keycloak and returns to SigNoz.
- User without Keycloak access cannot use local signup when `ABYSSO_DISABLE_SIGNUP=true`.
- Disabling the user in Keycloak blocks the next session.
