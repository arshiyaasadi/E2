# Production environment (product overlays)

Serves real users. **Host IPs, SSH, and nginx binds are not documented here** — use the Abysso Server control-plane repo (`inventory/`, `services/`).

## SSO / Keycloak (live)

Production Kicklok runs as **Docker Compose** from Server `services/keycloak/` (`sso.abysso.ir`). Product realms/seeds stay in `platform/identity/`.

## Overlays in this directory

| Path | Component | Note |
|---|---|---|
| `identity/` | Keycloak kustomize | Reference / future cluster path — not live SSO |
| `storage/` | Object storage | Product manifests |
| `file-service/` | file-service | Product manifests |
| `observability/` | SigNoz | Product manifests |

Historical note: ADRs 0002/0007/0009 describe k3s + Traefik. That path is paused for SSO while Compose is the approved runtime.

## Secrets

Never commit real values or kubeconfig. Server host paths hold live SSO secrets (`/opt/keycloak/.env`).
