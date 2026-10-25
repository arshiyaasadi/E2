# Module: cluster

Kubernetes (k3s) control plane baseline for Linux edge and future agents.

## Contents

| Path | Purpose |
|---|---|
| `README.md` | This file |
| `docs/k3s-install.md` | Install and upgrade runbook |
| `cert-manager/cluster-issuer.yaml` | Let's Encrypt HTTP-01 `ClusterIssuer` |
| `kustomization.yaml` | Optional apply of issuer after cert-manager is installed |

## Rules

- Linux OS on all nodes
- No real IPs, SSH keys, or kubeconfig in Git
- IngressClass name: `traefik` (k3s default)
- TLS: cert-manager + `letsencrypt-prod`
- Environments compose workloads under `infrastructure/environments/<env>/`

## Apply order

1. Install k3s (see `docs/k3s-install.md`)
2. Install cert-manager
3. `kubectl apply -k infrastructure/modules/cluster` (ClusterIssuer)
4. Apply environment overlays (identity → storage → file-service → observability)
