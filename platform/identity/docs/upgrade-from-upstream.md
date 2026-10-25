# Upgrade Keycloak from upstream

## Goal

Keep the in-repo Keycloak source current without drifting silently. Every upgrade is an explicit review.

## Prerequisites

- Access to this monorepo and permission to update the submodule
- Staging cluster available for soak testing after the bump

## Steps

1. Read the upstream [release notes](https://www.keycloak.org/docs/latest/release_notes/) and [upgrading guide](https://www.keycloak.org/docs/latest/upgrading/) for the target version.
2. From the repository root:

   ```bash
   cd platform/identity/upstream
   git fetch --tags origin
   git checkout <NEW_TAG>
   cd ../../..
   ```

3. Update `platform/identity/VERSION` so `KEYCLOAK_VERSION` and `KEYCLOAK_GIT_REF` match `<NEW_TAG>`.
4. Review the diff of the submodule commit (security fixes, breaking changes, DB migrations).
5. Rebuild the Keycloak container image from `upstream/` and push to the project registry with an immutable tag.
6. Deploy to `staging`. Watch health, login flows for both realms, and migration logs.
7. Run a smoke test: operator login with MFA path, customer login path, client-credentials token for a machine client.
8. Only after staging is healthy, deploy to `production` via the normal release process.
9. Record the upgrade in the service change log / PR description (old pin → new pin).

## Rules

- Never deploy an unpinned or `latest` image.
- Never skip staging.
- If the upgrade requires a database migration, take a verified backup (or confirm PITR window) before production.
- Theme customization is out of scope; do not carry unreviewed template overrides into an upgrade.

## Rollback

Redeploy the previous image tag built from the previous submodule pin. See [rollback release](../../../docs/runbooks/rollback-release.md). Database migrations follow Keycloak's own migration rules; do not invent reverse SQL without an upstream-supported path.
