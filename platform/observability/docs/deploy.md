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
- **RAM:** full SigNoz (ClickHouse + ZooKeeper + UI + collector) does **not** fit on the current 4 GiB edge alongside Keycloak, SeaweedFS, and first-party services. It OOMs the node and stalls the Kubernetes API. Re-install only after the edge has ≥8 GiB RAM, or place SigNoz on a dedicated node (for example DE) and keep the `noz` Ingress / OTLP path documented here.
- `values-edge.yaml` sets `clickhouse.zookeeper.heapSize: 256` (chart default is 1024 MiB).
