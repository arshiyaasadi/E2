# Release and Rollback

## Release

1. Changes are merged to `main` and verified in `staging`.
2. A release tag is created: `<service-name>/v<major>.<minor>.<patch>`.
3. Release notes list changes, migrations, configuration changes, and the rollback plan.
4. A production deployment is approved by the service owner.
5. The deployment runs through the pipeline. Nobody deploys manually.
6. The owner monitors metrics, errors, and logs for the observation window.

## Rollback triggers

- Error rate or latency above alert threshold after release
- Failed smoke tests
- Data inconsistency
- Owner decision

## Rollback procedure

1. Redeploy the previous image tag through the pipeline.
2. Migrations are not reverted automatically. Because migrations are backward compatible, the previous version works with the new schema.
3. If data was corrupted, follow the [restore database runbook](../runbooks/restore-database.md).
4. Record the incident and the cause.

## Requirements

- The previous image remains in the registry.
- The previous configuration version is retrievable.
- Rollback is rehearsed before go-live and quarterly afterwards.

Detailed steps: [rollback runbook](../runbooks/rollback-release.md).
