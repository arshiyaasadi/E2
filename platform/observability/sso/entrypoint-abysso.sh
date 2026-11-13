#!/bin/sh
# Abysso SSO overlay entrypoint for the first-party SigNoz image.
# Does not copy SigNoz Enterprise SSO. When OIDC env is set, export flags
# consumed by future in-tree patches under platform/observability/patches/.
# Until those patches land in the submodule branch, operators use Keycloak
# via documented OIDC client + (optional) Ingress auth; signup can be gated.
set -eu

if [ "${ABYSSO_OIDC_ENABLED:-false}" = "true" ]; then
  echo "abysso-sso: OIDC enabled issuer=${ABYSSO_OIDC_ISSUER:-unset}"
  export SIGNOZ_ABYSSO_OIDC_ENABLED=true
  export SIGNOZ_ABYSSO_OIDC_ISSUER="${ABYSSO_OIDC_ISSUER:-}"
  export SIGNOZ_ABYSSO_OIDC_CLIENT_ID="${ABYSSO_OIDC_CLIENT_ID:-signoz}"
  # Client secret must come from a mounted Secret / env — never bake into the image.
  export SIGNOZ_ABYSSO_DISABLE_SIGNUP="${ABYSSO_DISABLE_SIGNUP:-true}"
fi

# Upstream signoz/signoz image (v0.88+) ships the binary at /root/signoz.
for candidate in /root/signoz /bin/signoz /usr/local/bin/signoz /go/bin/query-service; do
  if [ -x "$candidate" ]; then
    exec "$candidate" "$@"
  fi
done

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
echo "abysso-sso: no signoz binary found; check upstream image layout" >&2
exit 1
