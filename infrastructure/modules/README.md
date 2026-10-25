# Modules

Reusable infrastructure building blocks, shared by all environments.

## Planned modules

| Module | Purpose |
|---|---|
| `network` | Zones, firewalls, private networking, VPN or bastion |
| `cluster` | Kubernetes control plane and Linux worker nodes |
| `edge` | Load balancer in front of the gateway / Ingress |
| `data` | Database and broker nodes, or managed service wiring |
| `storage` | Object storage and CDN |
| `backup-target` | Off-site backup storage |
| `management` | CI runners and observability hosts |

Orchestrator: Kubernetes ([ADR 0002](../../docs/architecture/decisions/0002-kubernetes-orchestration.md)).
