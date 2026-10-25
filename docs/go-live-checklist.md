# Go-Live Checklist

A service is **live** only when every item below is true. Copy this checklist into the service's README and track it there.

## Code and delivery

- [ ] Code is in this repository under `services/<name>/`
- [ ] CI runs tests, dependency scan, secret scan, and image build
- [ ] Image is pushed to the registry with an immutable tag (commit SHA)
- [ ] Database migrations are versioned and run as part of the release

## Runtime

- [ ] Runs with at least two instances in `production`
- [ ] CPU and memory limits are set
- [ ] Liveness and readiness checks are implemented and meaningful
- [ ] Graceful shutdown is implemented
- [ ] Previous version is available for rollback

## Access

- [ ] Reachable only through the gateway
- [ ] Validates tokens issued by the SSO
- [ ] Service-to-service calls use a machine identity
- [ ] Secrets come from the secret manager

## Data

- [ ] Has its own database (or schema) and its own database user
- [ ] Automated, encrypted, off-host backups are configured
- [ ] A restore has been performed successfully in a non-production environment
- [ ] Files, if any, are stored in object storage, not on local disk

## Observability

- [ ] Structured logs reach the central log store
- [ ] Trace ID is propagated on every request
- [ ] Core metrics (rate, errors, latency) are exported
- [ ] Alerts exist for error rate, latency, and dependency failures
- [ ] Sensitive actions are written to the audit log

## Documentation

- [ ] Service README is complete (owner, purpose, API, dependencies, data)
- [ ] Registered in `services/README.md`
- [ ] Runbook exists for known failure modes
