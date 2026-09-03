#!/usr/bin/env bash
# Run Veer in dev mode with platform credentials loaded.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_DIR/.env.veer-platform.local"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
else
  echo "warn: $ENV_FILE not found — Veer sign-in will be unavailable"
fi

cd "$REPO_DIR"
exec pnpm run dev "$@"
