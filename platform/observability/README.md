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
├── VERSION                 # app pin + submodule SHA
├── Dockerfile              # first-party signoz image (SHA / :main)
├── upstream/               # git submodule (SigNoz; org fork URL later)
├── sso/                    # CE-safe OIDC overlay hooks
├── patches/                # SSO patch policy
├── deploy/kubernetes/      # Helm values, Ingress, OIDC secret example
└── docs/                   # deploy, SSO, upgrade
```

Production overlay: `infrastructure/environments/production/observability/`.

SSO: [docs/sso.md](docs/sso.md). CI: `.github/workflows/signoz.yml`.

## Ingestion

- OTLP gRPC/HTTP: ClusterIP Service `signoz-otel-collector` (or equivalent) inside the cluster.
- Workloads and node agents send telemetry in-cluster. Do not expose OTLP on the public internet.
- Resource attributes: see [versioning and images](../../docs/operations/versioning-and-images.md).

Design reference: [logging and observability](../../docs/operations/logging-and-observability.md).
