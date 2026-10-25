# Gateway

The only public entry point of the platform.

Product: **Traefik** on **k3s** ([ADR 0007](../../docs/architecture/decisions/0007-traefik-gateway-on-k3s.md)).

## Responsibilities

- TLS termination and certificate management (via cert-manager)
- Host-based routing to services on the cluster network
- Rate limiting and middlewares (Traefik Middleware CRDs as needed)
- Trace ID creation and propagation (platform convention; gateway middleware later)
- Request and response size limits

## Public routes (production first bind)

| Host | Backend Service | Namespace |
|---|---|---|
| `sso.abysso.ir` | `keycloak` | `platform-identity` |
| `file.abysso.ir` | `file-service` | `services-file` |
| `noz.abysso.ir` | `signoz` (UI) | `platform-observability` |

Not routed publicly: Postgres, MinIO API/console, SigNoz OTLP.

## Layout

- Routes are Kubernetes `Ingress` objects next to each component (`deploy/kubernetes/ingress.yaml`).
- Environment overlays set `ingressClassName: traefik`, hostnames, and TLS secret names / cert-manager annotations.
- Cluster install and ClusterIssuer: `infrastructure/modules/cluster/`.

Design reference: [platform overview](../../docs/architecture/overview.md), [environments and servers](../../docs/operations/environments-and-servers.md).
