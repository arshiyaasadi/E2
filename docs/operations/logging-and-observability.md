# Logging and Observability

Stack: **SigNoz** ([ADR 0008](../architecture/decisions/0008-signoz-observability.md)). Operator UI: `https://noz.abysso.ir`.

## Signals

| Signal | Purpose | Retention (initial) |
|---|---|---|
| Application logs | Debugging and investigation | 30 days |
| Metrics | Health, capacity, alerting | 90 days |
| Traces | Following one request across services | 7 days |
| Audit logs | Who did what, when, from where | 1 year minimum, tamper-resistant |

## Log format

- Structured JSON, one event per line, written to standard output.
- Required fields: `timestamp`, `level`, `service`, `environment`, `version`, `trace_id`, `message`.
- Optional fields: `span_id`, `user_id` (opaque ID, never personal data), `request_id`, `error`.
- Levels: `debug`, `info`, `warn`, `error`. `debug` is disabled in `production` by default.

## What must never be logged

- Passwords, tokens, secrets, API keys
- Full payment card data
- Personal data beyond opaque identifiers

## Tracing

- The gateway creates a trace ID for every incoming request if none exists.
- Every service propagates the trace ID on outbound calls and messages.
- The trace ID is returned to clients in a response header to help support.

## Metrics

Every service exports at least:

- Request rate, error rate, latency (per endpoint)
- Dependency call rate, error rate, latency
- Resource usage (CPU, memory)
- Queue consumer lag, where applicable

## Audit log

Written for sensitive actions: logins, permission changes, admin actions, data exports, configuration changes, production access. Audit logs are append-only and stored separately from application logs.

## Alerting

| Alert | Condition (initial) |
|---|---|
| High error rate | 5xx rate above threshold at the gateway or a service |
| High latency | p95 latency above threshold |
| Service down | Readiness failing for all replicas |
| Disk pressure | Disk usage above 80% |
| Backup failure | Any backup job failed or did not run |
| Certificate expiry | TLS certificate expires within 14 days |
| Queue lag | Consumer lag above threshold |

- Alerts go to an on-call channel.
- Each alert links to a runbook in `docs/runbooks/`.

## Access

- Production logs are accessible only to authorized operators.
- Access to logs is itself logged.
