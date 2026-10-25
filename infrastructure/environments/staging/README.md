# Staging Environment

Mirrors `production` topology at smaller scale.

- Deployed automatically on merge to `main` (once CI/CD and cluster bind exist)
- Synthetic or anonymized data
- Target for restore rehearsals and platform upgrades
- Separate secrets, databases, buckets, and network from `production`
- Orchestrator: Kubernetes on Linux nodes
- First workload: Keycloak identity (see `identity/`)

## Server bind

Node inventory, kubeconfig, registry URL, and DNS are **not** committed yet. They will be added when server details are provided.
