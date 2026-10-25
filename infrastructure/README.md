# Infrastructure

Infrastructure as code for all environments. No manual changes on servers.

Orchestrator: **Kubernetes** on Linux ([ADR 0002](../docs/architecture/decisions/0002-kubernetes-orchestration.md)).

## Layout

```
infrastructure/
├── modules/          Reusable building blocks (network, cluster, data nodes, storage, ...)
└── environments/
    ├── local/        Developer setup
    ├── staging/      Integration, QA, restore rehearsals (+ identity overlay)
    └── production/   Real users (+ identity overlay)
```

Each environment composes modules with its own values. Secret values are never stored here.

First workload overlays: `environments/<env>/identity/` → `platform/identity/deploy/kubernetes/`.

Server bind (node inventory, kubeconfig, registry) is deferred until concrete server details are provided.

Design reference: [environments and servers](../docs/operations/environments-and-servers.md).
