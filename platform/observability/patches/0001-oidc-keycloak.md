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
2. **Submodule commits** — on org fork branch `abysso/sso`, add routes that complete OIDC and map roles (ADMIN/EDITOR/VIEWER). Keep the diff limited to auth/login packages.
3. **Cutover** — Helm/CD uses `REGISTRY/signoz:main`; Secret mounts OIDC env; public signup gated.

## Verification

- Login redirects to Keycloak and returns to SigNoz.
- User without Keycloak access cannot use local signup when `ABYSSO_DISABLE_SIGNUP=true`.
- Disabling the user in Keycloak blocks the next session.
