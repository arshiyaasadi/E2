# Keycloak Kubernetes manifests

Placeholder manifests for the identity workload. Replace all `REPLACE_*` values when binding servers.

| File | Purpose |
|---|---|
| `kustomization.yaml` | Base list of resources (local paths only) |
| `namespace.yaml` | `platform-identity` namespace |
| `configmap.yaml` | Non-secret Keycloak config |
| `secret.example.yaml` | Example Secret shape (not live values) |
| `deployment.yaml` | Keycloak Deployment (2 replicas intent) |
| `service.yaml` | ClusterIP Service |
| `ingress.yaml` | Ingress / TLS placeholders |
| `seed-job.yaml` | One-shot realm seed Job (first install only) |
| `postgres/` | Dedicated PostgreSQL cluster sketch |
| `network/` | NetworkPolicies (deny + allow Ingress/apps/Postgres) |

Environment overlays under `infrastructure/environments/<env>/identity/` reference **this directory once** (not each file with long `../` chains).

Always use POSIX forward slashes `/` in kustomize paths (never Windows `\`).

Apply order: namespace → network policies → postgres → secrets → configmap → deployment → service → ingress → seed Job.

See [../../docs/deploy.md](../../docs/deploy.md) and [../../docs/network.md](../../docs/network.md).
