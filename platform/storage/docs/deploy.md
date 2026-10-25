# Deploy MinIO on Kubernetes

## Goal

Run MinIO as the platform object store with a private API endpoint and an optional Console hostname.

## Manifests

Component manifests: `platform/storage/deploy/kubernetes/`

Environment overlays / references: `infrastructure/environments/<env>/`

## Prerequisites

- Kubernetes cluster (staging or production) — node inventory and kubeconfig bound in a later step
- Image tags from `platform/storage/VERSION`
- Persistent volumes for MinIO data
- Secrets in the secret manager: root credentials (bootstrap only), service account for `file-service`, OIDC client secret for Console
- Keycloak `operators` realm reachable for Console OIDC

## Intended topology

- Namespace: `platform-storage`
- MinIO: StatefulSet, 1 replica in staging placeholders; production intent 4+ for distributed mode (document when nodes exist)
- Services: ClusterIP for S3 API (`9000`) and Console (`9001`)
- Ingress / TLS: placeholders until gateway and certificates are wired
- Readiness / liveness: HTTP health on the MinIO API port

## Order

1. Create namespace and pull secrets from the secret manager into Kubernetes Secrets (never commit values).
2. Apply NetworkPolicies so only `file-service`, ingress (Console), and backup jobs reach MinIO.
3. Apply ConfigMap (region, browser redirect, OIDC endpoints as non-secret URLs).
4. Apply StatefulSet, PVC, and Services.
5. Apply Ingress when TLS and DNS are ready (Console host separate from S3 API if exposed).
6. Run bucket bootstrap Job from `buckets/` definitions.
7. Configure Console OIDC ([console-oidc.md](console-oidc.md)).
8. Verify health, `mc ls` from a job with service credentials, and Console login via Keycloak.

## Placeholders

- `REPLACE_IMAGE_REGISTRY`
- `REPLACE_MINIO_API_HOSTNAME`
- `REPLACE_MINIO_CONSOLE_HOSTNAME`
- `REPLACE_KEYCLOAK_OPERATORS_ISSUER`
- `REPLACE_BACKUP_BUCKET_ENDPOINT`

Do not commit real hostnames or credentials.
