#!/bin/sh
set -e

cd /app

lock_hash() {
  if [ -f yarn.lock ]; then
    cksum yarn.lock | awk '{print $1" "$2}'
  elif [ -f package-lock.json ]; then
    cksum package-lock.json | awk '{print $1" "$2}'
  else
    echo "none"
  fi
}

MARKER="node_modules/.install-hash"
CURRENT="$(lock_hash)"

if [ ! -d node_modules/.bin ] || [ ! -f "$MARKER" ] || [ "$(cat "$MARKER")" != "$CURRENT" ]; then
  echo "[entrypoint] Installing dependencies..."
  if [ -f yarn.lock ]; then
    yarn install --frozen-lockfile || yarn install
  else
    npm ci || npm install
  fi
  mkdir -p node_modules
  echo "$CURRENT" > "$MARKER"
  echo "[entrypoint] Dependencies ready."
else
  echo "[entrypoint] node_modules up to date — skipping install."
fi

# Prisma client for admin (no-op if script missing)
if grep -q '"db:generate"' package.json 2>/dev/null; then
  yarn db:generate || true
fi

exec "$@"
