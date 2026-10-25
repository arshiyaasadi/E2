# Vision and Scope

## Vision

A single repository that holds an entire e-commerce platform, built as independently deployable microservices on a shared, production-grade platform foundation.

## Principles

1. **Platform first.** Every service runs on the same foundation: gateway, SSO, logging, backups, secrets, CI/CD.
2. **Secure by default.** Nothing is publicly reachable unless it is explicitly routed through the gateway.
3. **Stable by design.** Multiple instances, health checks, graceful degradation, and rehearsed recovery.
4. **Data is owned.** Each service owns its data and exposes it only through its API or events.
5. **Recoverable.** A backup counts only once it has been restored.
6. **Reproducible.** Environments are created from definitions, not from manual steps.
7. **Observable.** Every request can be traced from the gateway to the last service it touched.

## In scope (current phase)

- Code management and CI/CD
- Environments, servers, and orchestration
- API gateway
- Identity and SSO
- Microservice conventions
- Databases and backups
- File storage
- Logging, metrics, audit
- Security and reliability

## Out of scope (current phase)

- Branding and visual design
- Storefront application
- Admin panel application
- Business features (catalog, cart, orders, payments, ...)

The storefront and admin panel already exist outside this repository. They will be connected through `apps/` once the platform foundation is live.
