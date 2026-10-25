# Channel reconciler (server-side CD)

Runs inside k3s. Watches first-party images on the **`main`** channel and rolls out Deployments when the digest changes.

Developers never run this. CI only pushes `:sha` and `:main`.

## Deploy on edge

```bash
kubectl apply -k pipelines/cd/channel-reconciler
```

Configure ConfigMap `cd-channels` with registry and service list. Create Secret `cd-registry` if the registry needs pull/auth for crane.

## Behaviour

Every few minutes the CronJob:

1. Ensures each listed workload image is `REGISTRY/SERVICE:main` (Deployment **or** StatefulSet; auto-detected)
2. Annotates `cd.abysso.ir/channel=main` when it updates
3. Waits for rollout (best-effort)

Example CHANNELS rows: `file-service` and `keycloak` (Deployments), `signoz` (StatefulSet).

The Job image is `alpine:3.20` plus a **static** `kubectl` on the node at `/opt/e2/bin/kubectl` (install once from `dl.k8s.io`). Do not mount the k3s `kubectl` symlink — that binary is the full k3s server and stalls the API on a small node.
