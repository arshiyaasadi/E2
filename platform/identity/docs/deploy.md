# Deploy Keycloak

## Production (current)

Production Kicklok/SSO runs as **Docker Compose** on the host recorded in the Abysso **Server** inventory — not from this repo’s kustomize overlays.

| Concern | Where |
|---|---|
| Host / IP / SSH | Server `inventory/servers.json` |
| Compose + nginx + reboot | Server `services/keycloak/` |
| Secrets | Server host `/opt/keycloak/.env` only |
| DNS / Arvan | Server `docs/dns-sso.md` |
| Image pin | `quay.io/keycloak/keycloak` matching [VERSION](../VERSION) |
| Realms / roles / seeds (product) | This tree: `realms/`, `seeds/`, [identity-sso](../../../docs/operations/identity-sso.md) |

Do not copy host IPs into E2 docs.

## Kubernetes manifests (reference / future)

Component manifests still live under `platform/identity/deploy/kubernetes/` and environment overlays under `infrastructure/environments/<env>/identity/`. They are **not** the live production path for SSO while Compose is in force.

If/when a dedicated cluster returns:

1. Postgres reachable from the cluster network
2. Secrets from the secret manager into Kubernetes Secrets (never commit values)
3. ConfigMaps, Deployment/Service, Ingress, one-shot seed Job ([seeding](seeding.md))
4. Verify `/health/ready` and JWKS

Placeholder tokens such as `REPLACE_*` remain for that future bind only.
