# 0008. SigNoz as observability stack

- Status: accepted
- Date: 2026-10-21

## Context

The platform requires correlated logs, metrics, and traces with a single operator UI ([logging and observability](../../operations/logging-and-observability.md)). Lightweight container log viewers are not enough for request tracing across services. The first UI host is `noz.abysso.ir` on the edge cluster.

## Decision

- Use **SigNoz** (OpenTelemetry-native) as the central observability stack.
- Expose only the **SigNoz UI** on `noz.abysso.ir` through the Traefik gateway.
- Keep OTLP ingestion on ClusterIP (in-cluster collectors and workloads). Do not publish OTLP on the public internet.
- Every workload sets OpenTelemetry resource attributes `service.name`, `service.version`, and `deployment.environment`.

## Consequences

- Manifests live under `platform/observability/deploy/kubernetes/` and production overlays under `infrastructure/environments/production/observability/`.
- ClickHouse retention and memory limits must stay conservative on the single-node edge until a data node is added.
- Edge target for co-located SigNoz is **≥8 GiB RAM** (with Keycloak + object storage + app services). Below that, place SigNoz on a dedicated node. Helm values and Ingress overlays live under `platform/observability/` and `infrastructure/environments/production/observability/`.
- The **SigNoz app** image is first-party (`REGISTRY/signoz:<sha>` / `:main`) from a controlled submodule + SSO overlay; ClickHouse / ZooKeeper / collector remain chart vendor images. Operator SSO uses Keycloak (`operators` realm) via a CE-safe Abysso adapter — not Enterprise SSO code.
- SigNoz is for observation (metrics, logs, traces, alerts), not for deploy/scale control; orchestration remains Kubernetes.
