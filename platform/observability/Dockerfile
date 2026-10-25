# First-party SigNoz app image for the SHA / :main channel (ADR 0008, ADR 0009).
# Build from repository root (after submodule init):
#   docker build -f platform/observability/Dockerfile \
#     --build-arg SIGNOZ_IMAGE_TAG=v0.88.0 \
#     -t REPLACE_IMAGE_REGISTRY/signoz:local .
#
# Default: start from the upstream image matching VERSION (Docker Hub tag includes
# the leading "v", e.g. signoz/signoz:v0.88.0), then apply Abysso SSO overlay.

ARG SIGNOZ_IMAGE_TAG=v0.88.0
FROM docker.io/signoz/signoz:${SIGNOZ_IMAGE_TAG}

USER root
COPY platform/observability/sso/entrypoint-abysso.sh /usr/local/bin/entrypoint-abysso.sh
COPY platform/observability/sso/oidc-env.example /etc/signoz/oidc-env.example
RUN chmod +x /usr/local/bin/entrypoint-abysso.sh \
 && mkdir -p /etc/signoz \
 && chown -R 65532:65532 /etc/signoz /usr/local/bin/entrypoint-abysso.sh || true
# Upstream image USER varies by tag; leave final USER to the base image default after COPY.

# Preserve upstream CMD; wrap via entrypoint when set in the Deployment.
# Helm/CD should set command/args to use entrypoint-abysso.sh if OIDC env is present.
LABEL org.opencontainers.image.title="Abysso SigNoz" \
      org.opencontainers.image.source="https://github.com/arshiyaasadi/E2" \
      org.opencontainers.image.description="Controlled SigNoz app image with Abysso SSO overlay hooks"
