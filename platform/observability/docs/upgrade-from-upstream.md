# Upgrade SigNoz from upstream

## Goal

Keep the controlled SigNoz source current without silent drift. Every upgrade is an explicit review. SSO changes stay on the Abysso overlay / `abysso/sso` fork branch ([../patches/](../patches/)).

## Prerequisites

- Permission to update the `platform/observability/upstream` submodule
- Green CI for `signoz` after the bump
- Staging or a maintenance window on the edge

## Steps

1. Read upstream SigNoz release notes for the target tag.
2. From the repository root:

   ```bash
   cd platform/observability/upstream
   git fetch --tags origin
   git checkout <NEW_TAG>
   cd ../../..
   ```

3. Update `platform/observability/VERSION` (`SIGNOZ_VERSION`, `SIGNOZ_GIT_REF`, `SIGNOZ_GIT_SHA`, chart version if needed).
4. Rebase or re-apply SSO commits / patches listed under `patches/`. Do not drop Keycloak OIDC env contract.
5. Open a PR. CI builds `REGISTRY/signoz:<sha>` and on merge moves `:main`.
6. CD reconciler rolls the `signoz` workload. Verify UI, OIDC login, and hostmetrics.
7. Record old pin → new pin in the PR description.

## Rules

- Never deploy an unpinned or `latest` app image for the first-party channel.
- Never copy SigNoz Enterprise SSO into the tree.
- ClickHouse / ZooKeeper / collector upgrades follow Helm chart values, not the app SHA channel.

## Rollback

Re-promote a previous git SHA to `:main` (or `kubectl set image` temporarily). See [rollback release](../../../docs/runbooks/rollback-release.md).
