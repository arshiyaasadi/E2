# Deploy Keycloak on Kubernetes

## Goal

Run Keycloak as the first platform workload on Kubernetes (Linux nodes).

## Manifests

Component manifests: `platform/identity/deploy/kubernetes/`

Environment overlays / references: `infrastructure/environments/<env>/`

## Prerequisites

- Kubernetes cluster (staging or production) — node inventory and kubeconfig bound in a later step
- Container image from CI: `REGISTRY/keycloak:<sha>` / `:main` (Dockerfile + `VERSION` pin; see ADR 0009). Source submodule remains the reviewable pin.
- PostgreSQL instance for identity (see `../database/`)
- Secrets in the secret manager: DB password, admin bootstrap secret, TLS material

## Intended topology

- Namespace: `platform-identity` (placeholder name)
- Keycloak: 2 replicas in production, 1–2 in staging
- Service: ClusterIP
- Ingress / TLS: placeholders until gateway and certificates are wired
- Readiness probe: HTTP `/health/ready` on the management port
- Liveness probe: HTTP `/health/live` on the management port

## Order

1. Ensure PostgreSQL is up and reachable from the cluster network.
2. Create namespace and pull secrets / DB credentials from the secret manager into Kubernetes Secrets (never commit values).
3. Apply NetworkPolicies (`deploy/kubernetes/network/`) so Ingress, apps, and Postgres paths match [network.md](network.md). Label application namespaces with `platform.e2/access-identity=true`.
4. Apply ConfigMaps (hostname, DB vendor `postgres`, non-secret options).
5. Apply Keycloak Deployment (or StatefulSet) and Service.
6. Apply Ingress when TLS and DNS are ready (split public OIDC host vs admin host).
7. Apply seed Job once on first install (see [seeding](seeding.md)).
8. Verify `/health/ready`, JWKS from an app-namespace test pod, and Admin Console only on the admin hostname.

## Placeholders

Until server details are provided, manifests use values such as:

- `REPLACE_IMAGE_REGISTRY`
- `REPLACE_KEYCLOAK_HOSTNAME`
- `REPLACE_ADMIN_HOSTNAME`
- `REPLACE_DB_HOST`

Do not commit real hostnames or credentials.
