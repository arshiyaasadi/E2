# Production observability overlay

1. Helm-install SigNoz (`platform/observability/docs/deploy.md`).
2. Apply this overlay for namespace, Ingress `noz.abysso.ir`, and node OTel DaemonSet.
3. Adjust OTLP Service name in `otel-daemonset.yaml` if the Helm chart names the collector differently (`kubectl -n platform-observability get svc`).
4. `otel-daemonset.yaml` also ships container stdout/stderr from `/var/log/pods` into SigNoz Logs.
5. `otel-platform-scraper.yaml` collects pod CPU/memory, Keycloak login counters, and Kubernetes Warning events (image pull, backoff) into the in-cluster collector.
6. `otlp-wireguard.yaml` publishes collector OTLP/HTTP on the edge WireGuard address only, so the non-k8s host agent can send host metrics. Do not add a public Ingress for this port.
7. Host agent config for that machine: `platform/observability/deploy/host-agent/otel-config.yaml`.
8. Dashboard definition: `platform/observability/dashboards/platform-overview.json`.
9. Saved Logs views: `platform/observability/dashboards/platform-logs-view.json` and `platform/observability/dashboards/container-image-pull-view.json`.
