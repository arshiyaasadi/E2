# Production Environment

Serves real users.

- Deployed only from approved release tags through the pipeline (manual k3s bind allowed for first bring-up)
- Orchestrator: **k3s** on the edge Linux node ([ADR 0007](../../../docs/architecture/decisions/0007-traefik-gateway-on-k3s.md))
- Gateway: Traefik; TLS via cert-manager Let's Encrypt
- First single-node bind uses **1 replica** per workload; raise when agents exist

## DNS

| Host | Public | Notes |
|---|---|---|
| `sso.abysso.ir` | Yes | Keycloak |
| `file.abysso.ir` | Yes | file-service |
| `noz.abysso.ir` | Yes | SigNoz UI |
| `pg.abysso.ir` | No | In-cluster only; no Ingress |

Operator creates public A records for the three public hosts to the edge node address. Do not publish `pg.abysso.ir`.

## Overlays in this directory

| Path | Component |
|---|---|
| `identity/` | Keycloak + Postgres |
| `storage/` | MinIO (ClusterIP) |
| `file-service/` | file-service + Ingress |
| `observability/` | SigNoz + Ingress |

Apply order: cluster prerequisites (cert-manager, ClusterIssuer) → identity → storage → file-service → observability.

## Secrets

Materialize Secrets on the node from `secret.example.yaml` templates. Never commit real values or kubeconfig.
