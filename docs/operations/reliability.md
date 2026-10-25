# Reliability

## Goals

- Losing one instance or one node does not take a service down.
- A failing dependency degrades one feature, not the whole platform.
- Any release can be rolled back quickly.
- Any database can be restored within the RTO.

## Practices

| Practice | Rule |
|---|---|
| Redundancy | At least two replicas per service in `production`, on different nodes |
| Health checks | Readiness reflects critical dependencies, not just "process is up" |
| Timeouts | Every outbound call has a timeout |
| Retries | Only for idempotent operations, with backoff and a limit |
| Circuit breakers | Stop calling a dependency that keeps failing |
| Queues | Heavy or slow work is moved off the request path |
| Graceful shutdown | In-flight requests finish before the process exits |
| Resource limits | Every container has CPU and memory limits |
| Capacity | Autoscaling or documented manual scaling per service |

## Service level objectives (initial)

| SLO | Target |
|---|---|
| Gateway availability | 99.9% monthly |
| Gateway 5xx ratio | Below 0.5% |
| Gateway p95 latency | Below 500 ms |

SLOs are reviewed once real traffic exists.

## Recovery rehearsals

- Rollback rehearsal: at least once before go-live, then quarterly.
- Database restore rehearsal: monthly. See [database and backup](database-and-backup.md).
- Results are recorded in the related runbook.
