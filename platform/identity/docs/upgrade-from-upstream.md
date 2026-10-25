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
5. Open a PR. CI workflow `keycloak-ci` builds `REGISTRY/keycloak:<git-sha>` from `platform/identity/Dockerfile` (VERSION pin) and on merge to `main` also tags `:main`.
6. CD channel-reconciler rolls `platform-identity/keycloak` to `:main`. Prefer staging soak when a second environment exists; on the single-node edge, use a maintenance window.
7. Smoke test: operator login, customer login path, JWKS, machine client if used.
8. Record the upgrade in the PR description (old pin → new pin).

## Rules

- Never deploy an unpinned or `latest` image on the channel.
- Source pin in `VERSION` + submodule must match what CI baked into the image build-arg.
- If the upgrade requires a database migration, take a verified backup (or confirm PITR window) before production.
- Theme customization is out of scope; do not carry unreviewed template overrides into an upgrade.

## Rollback

Re-promote a previous git SHA to `:main` (or pin the Deployment image temporarily). See [rollback release](../../../docs/runbooks/rollback-release.md). Database migrations follow Keycloak's own migration rules; do not invent reverse SQL without an upstream-supported path.
