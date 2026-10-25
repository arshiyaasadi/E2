# Observability

Central collection of logs, metrics, traces, and audit records, plus alerting.

Stack: **SigNoz** ([ADR 0008](../../docs/architecture/decisions/0008-signoz-observability.md)).

Public UI: `https://noz.abysso.ir` (Traefik Ingress only).

## Responsibilities

- Log collection and storage with retention
- Metrics collection and dashboards
- Distributed tracing
- Separate, append-only audit log storage (platform convention; ship to SigNoz or dedicated store later)
- Alert rules linked to runbooks
- Access control for production telemetry

## Layout

```
platform/observability/
├── README.md
├── VERSION
├── deploy/kubernetes/     # base manifests / Helm-rendered kustomize
└── docs/                  # retention and collector notes
```

Production overlay: `infrastructure/environments/production/observability/`.

## Ingestion

- OTLP gRPC/HTTP: ClusterIP Service `signoz-otel-collector` (or equivalent) inside the cluster.
- Workloads and node agents send telemetry in-cluster. Do not expose OTLP on the public internet.
- Resource attributes: see [versioning and images](../../docs/operations/versioning-and-images.md).

Design reference: [logging and observability](../../docs/operations/logging-and-observability.md).
