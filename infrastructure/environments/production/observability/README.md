# Production observability overlay

1. Helm-install SigNoz (`platform/observability/docs/deploy.md`).
2. Apply this overlay for namespace, Ingress `noz.abysso.ir`, and node OTel DaemonSet.
3. Adjust OTLP Service name in `otel-daemonset.yaml` if the Helm chart names the collector differently (`kubectl -n platform-observability get svc`).
