# Deploy SigNoz

## Helm (preferred on k3s)

```bash
kubectl apply -f platform/observability/deploy/kubernetes/namespace.yaml

helm repo add signoz https://charts.signoz.io
helm repo update

helm upgrade --install signoz signoz/signoz \
  --namespace platform-observability \
  --version 0.85.0 \
  -f platform/observability/deploy/kubernetes/values-edge.yaml \
  --wait --timeout 20m
```

Then apply the production overlay Ingress (hostname `noz.abysso.ir`).

Confirm in-cluster OTLP:

```bash
kubectl -n platform-observability get svc | grep -E 'otel|signoz'
```

Workloads should export to `http://signoz-otel-collector.platform-observability.svc:4317` (exact Service name from `kubectl get svc`).

## Notes

- UI only is public via Traefik on `noz.abysso.ir`.
- Do not publish OTLP NodePorts.
- **RAM:** edge target is **≥8 GiB** when running SigNoz beside Keycloak, object storage, and first-party services. On 4 GiB the install OOMs the node; use a dedicated node if RAM is below 8 GiB.
- **Disk:** keep ClickHouse/ZK PVC sizes in `values-edge.yaml` conservative on a small root volume; raise them when disk is expanded.
- `values-edge.yaml` sets `clickhouse.zookeeper.heapSize: 256` (chart default is 1024 MiB).
- ZooKeeper image is pinned to `bitnamilegacy/zookeeper:3.7.1` because `docker.io/bitnami/zookeeper:3.7.1` is no longer published on Docker Hub.
- **App image channel:** `values-edge.yaml` points `signoz.image` at `registry.platform-cd.svc:5000/signoz:main` (CI). ClickHouse / ZooKeeper / collector stay on chart vendor images.
- **SSO:** see [sso.md](sso.md). Materialize `signoz-oidc` from [../deploy/kubernetes/signoz-oidc.secret.example.yaml](../deploy/kubernetes/signoz-oidc.secret.example.yaml), then patch the workload envFrom (see `signoz-image-patch.yaml`).
- **Source pin:** [../VERSION](../VERSION) and submodule `platform/observability/upstream/`. Upgrade: [upgrade-from-upstream.md](upgrade-from-upstream.md).
