# Messaging

The message broker for asynchronous work and events between services.

## Responsibilities

- Queues for background work
- Topics for domain events
- Dead-letter handling for messages that keep failing
- Consumer lag metrics

## Planned contents

- `topics/`: event and queue definitions with owner and schema version
- `docs/`: product choice (ADR link) and event naming rules

Design reference: [microservice conventions](../../docs/architecture/microservices.md).
