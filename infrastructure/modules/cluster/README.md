# Module: cluster

Kubernetes (k3s) baseline **retained for a future dedicated cluster**. Production Kicklok/SSO does **not** use this module today — see Abysso Server `services/keycloak/`.

## Contents

| Path | Purpose |
|---|---|
| `README.md` | This file |
| `docs/k3s-install.md` | Archived install notes (no host IPs) |
| `cert-manager/cluster-issuer.yaml` | Let's Encrypt HTTP-01 `ClusterIssuer` (future) |
| `kustomization.yaml` | Optional apply of issuer after cert-manager |

## Rules

- No real IPs, SSH keys, or kubeconfig in Git
- Host inventory lives only in the Server control-plane repo
