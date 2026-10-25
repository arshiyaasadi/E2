# First-party Keycloak image for the SHA / :main channel (ADR 0001, ADR 0009).
# Build from repository root:
#   docker build -f platform/identity/Dockerfile \
#     --build-arg KEYCLOAK_VERSION=26.8.1 \
#     -t REPLACE_IMAGE_REGISTRY/keycloak:local .
#
# KEYCLOAK_VERSION must match platform/identity/VERSION (submodule pin).
# CI tags the result as REGISTRY/keycloak:<git-sha> and :main.
#
# Full Maven rebuild from platform/identity/upstream is intentionally not the
# default CI path (too heavy for shared runners / edge). Use upstream's own
# quarkus/container flow when you need a from-source artifact, then retag.

ARG KEYCLOAK_VERSION=26.8.1
FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}

LABEL org.opencontainers.image.title="Abysso Keycloak" \
      org.opencontainers.image.source="https://github.com/arshiyaasadi/E2" \
      org.opencontainers.image.description="Pinned Keycloak runtime for platform-identity (VERSION + submodule)"
