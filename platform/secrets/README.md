# Secrets

The secret manager and the rules for storing and rotating secrets.

## Responsibilities

- Central storage for all secrets per environment
- Runtime injection into services
- Rotation schedules
- Access policies per service and per operator
- Access audit

This folder never contains secret values. It holds only policy and naming definitions.

## Planned contents

- `policies/`: which service or role can read which secret path
- `docs/`: product choice (ADR link) and rotation procedure

Design reference: [security](../../docs/operations/security.md).
