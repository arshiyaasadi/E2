# 0002. Kubernetes orchestration

- Status: accepted
- Date: 2026-10-21

## Context

The platform needs a reproducible orchestrator for Linux servers, with multi-replica services, health checks, rolling updates, and a clear path from staging to production. The first workload is the identity (Keycloak) component. Real node inventory and kubeconfig will be supplied in a later step.

## Decision

- Use **Kubernetes** as the orchestration platform for all environments (`local` tooling may use a lightweight cluster; `staging` and `production` use full clusters on Linux nodes).
- Define cluster and workload manifests under `infrastructure/` and component-specific deploy trees (for example `platform/identity/deploy/kubernetes/`).
- First cluster workload: Keycloak identity only.
- Manifests in this phase use placeholders for hosts, registry, and TLS secrets. No real server addresses or credentials are committed.
- Production intent: at least two Keycloak replicas, readiness via `/health/ready`, Ingress/TLS in front of the service.

## Consequences

- Orchestration conventions are fixed early; later services reuse the same patterns.
- Binding to physical or cloud nodes is deferred until server details are provided.
- Operators need Kubernetes skills and access control for cluster administration.
