# 0001. Keycloak as identity provider

- Status: accepted
- Date: 2026-10-21

## Context

The platform needs a single OIDC identity provider for SSO, with separate realms for customers and operators, machine identities for service-to-service calls, MFA for operators, and auditable authentication events. The identity source must be owned in this monorepo so the team can review and adopt upstream releases deliberately.

## Decision

- Use **Keycloak** as the platform Identity Provider.
- Keep the Keycloak source in-repo at `platform/identity/upstream/` as a **git submodule** pinned to a specific upstream release tag (recorded in `platform/identity/VERSION`).
- Build the runtime image from that pinned source. Do not use an unpinned `latest` image for deployment.
- Upgrade process: review the upstream changelog and diff, bump the submodule pin, rebuild the image, apply database migrations in `staging` first, then `production`.
- No login theme or branding changes in the current phase.
- Realm configuration and seeds live under `platform/identity/realms/` (no secrets in Git).
- Dedicated PostgreSQL database for Keycloak in each environment.

## Consequences

- SSO capabilities match the platform identity requirements (OIDC, realms, PKCE, client credentials, MFA, JWKS, events).
- The monorepo carries Keycloak source via submodule; clones require `git submodule update --init --recursive`.
- Upgrades are explicit and reviewable, but require capacity to rebuild and test before production.
- The submodule remote can later point to an organization fork without changing the folder layout.
