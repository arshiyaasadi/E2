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

# Prefer upstream docker entrypoint / binary if present.
if [ -x /bin/signoz ]; then
  exec /bin/signoz "$@"
fi
if [ -x /go/bin/query-service ] || [ -x /usr/local/bin/signoz ]; then
  if [ -x /usr/local/bin/signoz ]; then
    exec /usr/local/bin/signoz "$@"
  fi
fi

# Fall through to image default CMD
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
exec /bin/sh -c "echo 'abysso-sso: no signoz binary found; check upstream image layout' >&2; exit 1"
