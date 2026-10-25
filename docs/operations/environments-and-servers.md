# Environments and Servers

## Environments

| Environment | Purpose | Data | Deploy trigger |
|---|---|---|---|
| `local` | Developer machine | Fake data | Manual |
| `staging` | Integration, QA, restore rehearsals | Synthetic or anonymized | Merge to `main` |
| `production` | Real users | Real data | Approved release tag |

Rules:

- Environments do not share databases, secrets, storage buckets, or networks.
- Production data never goes to `staging` or `local` unless anonymized.
- `staging` mirrors `production` topology at smaller scale.

## Server roles

| Role | Responsibility |
|---|---|
| Edge | Traefik gateway, public Ingress, first k3s server node |
| Application nodes | Service pods (k3s agents when scaled) |
| Data nodes | Databases and message broker (or managed services) |
| Storage | Object storage (or managed service) |
| Management | CI runners, observability stack, bastion |
| Backup target | Off-site storage for backups, separate from data nodes |

## Production DNS (first bind)

Public A records point at the edge node. Only these hosts are published through Traefik.

| Host | Public | Target |
|---|---|---|
| `sso.abysso.ir` | Yes | Keycloak (`platform-identity`) |
| `file.abysso.ir` | Yes | `file-service` (`services-file`) |
| `noz.abysso.ir` | Yes | SigNoz UI (`platform-observability`) |
| `pg.abysso.ir` | No | Logical name only; use in-cluster Service DNS. No public A and no Ingress in this phase. Future pgAdmin may get an Ingress behind SSO later. |

Rules:

- Databases and MinIO S3/API stay **ClusterIP**. Never expose Postgres or MinIO admin on the public internet.
- OTLP for SigNoz stays in-cluster (ClusterIP). Do not publish OTLP publicly.
- VPN and unrelated host services are out of scope for this platform gateway.

## Orchestration

- Orchestrator: **Kubernetes** on Linux ([ADR 0002](../architecture/decisions/0002-kubernetes-orchestration.md)).
- First production distribution: **k3s** single-node on the edge ([ADR 0007](../architecture/decisions/0007-traefik-gateway-on-k3s.md)).
- Gateway: **Traefik** (k3s default IngressClass).
- TLS: **cert-manager** + Let's Encrypt HTTP-01 (`letsencrypt-prod`).
- Observability: **SigNoz** on `noz.abysso.ir` ([ADR 0008](../architecture/decisions/0008-signoz-observability.md)).
- All services run as containers under Kubernetes.
- Each service declares resource requests and limits.
- Production intent: at least two replicas per service across nodes; the first single-node bind patches replicas to **1** until agents exist.
- Rolling updates by default. See [deployment scenarios](../deployment/scenarios.md).
- Image and version convention: [versioning and images](versioning-and-images.md).

## Infrastructure as code

- All infrastructure is defined in `infrastructure/`.
- Component manifests live under `platform/*/deploy/kubernetes/` and `services/*/deploy/kubernetes/`.
- Environment overlays under `infrastructure/environments/<env>/` bind hostnames, replica counts, and image tags.
- Manual changes on servers are not allowed. If an emergency change is made, it is reflected in code the same day.
- An environment can be recreated from `infrastructure/` plus backups.
- Never commit secrets, kubeconfig, or production passwords. Use `secret.example.yaml` templates only.

## Access

- Servers are not reachable from the internet except the edge gateway ports (80/443 for platform hosts).
- Operator access goes through VPN or a bastion with named accounts.
- All operator sessions on `production` are logged.
