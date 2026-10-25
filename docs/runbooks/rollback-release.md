# Rollback Release

## When to use

A service release causes elevated errors, latency, failed smoke tests, or wrong behavior.

## Prerequisites

- Access to the deployment pipeline
- Previous release tag of the service

## Steps

1. Announce the rollback in the incident channel.
2. Identify the previous healthy release tag.
3. Trigger the pipeline deployment of the previous tag to `production`.
4. Do not revert database migrations unless the migration itself is the cause and a reviewed down-migration exists.
5. If configuration was changed in the same release, restore the previous configuration version.

## Verification

- Error rate and latency return to normal.
- Readiness checks pass on all replicas.
- Smoke tests pass.

## Escalation

If rollback does not restore service, escalate to the platform owner and follow [incident response](incident-response.md).

## Rehearsal log

| Date | Who | Service | Result | Notes |
|---|---|---|---|---|
