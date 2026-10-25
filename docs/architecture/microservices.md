# Microservice Conventions

Every service in `services/` follows these conventions so that each new service looks like the previous one.

## Service folder layout

```
services/<service-name>/
├── README.md        Owner, purpose, API, dependencies, data, go-live checklist
├── docs/            Service-specific design notes and runbooks
├── src/             Application source (added in the implementation phase)
├── migrations/      Versioned database migrations
├── tests/           Automated tests
└── deploy/          Service deployment definitions (per environment overrides)
```

## Boundaries

- One service owns one business capability.
- A service owns its data. Other services never access its database directly.
- Shared code is limited to cross-cutting libraries (logging, auth client, tracing). Business logic is not shared.

## Communication

| Need | Style |
|---|---|
| Immediate answer required | Synchronous HTTP or gRPC through internal network |
| Work that can happen later | Asynchronous message through the broker |
| Notifying others that something happened | Event published to the broker |

Rules:

- Every outbound call has a timeout.
- Retries are used only for idempotent operations, with backoff.
- A circuit breaker protects the service from a failing dependency.
- Events are versioned and backward compatible.
- Consumers are idempotent (the same message can arrive twice).

## API

- APIs are versioned (for example, `/v1/...`).
- Breaking changes require a new version and a deprecation period.
- Error responses use a consistent format across all services.
- The API contract is documented in the service's `docs/`.

## Runtime contract

Every service must provide:

- **Liveness check:** the process is running.
- **Readiness check:** the service can serve traffic (critical dependencies reachable).
- **Metrics endpoint:** rate, errors, latency, and resource usage.
- **Structured logs** to standard output, including trace ID.
- **Graceful shutdown:** finish in-flight requests, then exit.
- **Configuration from environment**, secrets from the secret manager.

## Naming

- Service names: kebab-case, singular business noun (for example, `order-service`).
- Database name: same as the service.
- Event names: `<domain>.<entity>.<past-tense-verb>` (for example, `order.order.created`).
