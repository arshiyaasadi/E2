# Security

## Principles

- Least privilege everywhere: people, services, database users, storage access.
- Nothing is public unless it is routed through the gateway.
- Every privileged action is attributable to a named identity.

## Secrets

- All secrets live in the secret manager: database passwords, storage keys, client secrets, signing keys, third-party API keys.
- Secrets are injected at runtime. They are not baked into images or committed to Git.
- Secrets rotate on a schedule and immediately after suspected exposure.
- CI runs secret scanning on every change.

## Network

- Network zones as defined in [platform overview](../architecture/overview.md).
- Default-deny between zones. Allowed flows are explicit.
- TLS on all public traffic. Internal traffic is encrypted where it crosses hosts.

## Supply chain

- Dependencies are scanned in CI.
- Base images come from trusted sources and are updated regularly.
- Container images are scanned before deployment.
- Only images from the project registry can run in `staging` and `production`.

## Access control

- Operator access via SSO (`operators` realm) with multi-factor authentication.
- Production access is granted per person, reviewed regularly, and logged.
- No shared accounts.

## Application security

- Input validation at service boundaries.
- Rate limiting at the gateway.
- Authorization checked inside every service, not only at the gateway.
- Security headers on all web responses.

## Data protection

- Encryption at rest for databases, object storage, and backups.
- Personal data is minimized and never written to logs.
- Data retention and deletion rules are defined per service.

## Incident response

See [incident response runbook](../runbooks/incident-response.md).
