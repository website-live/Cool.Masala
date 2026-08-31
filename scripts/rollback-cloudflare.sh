#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
VERSION_ID="${2:-}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: scripts/rollback-cloudflare.sh <staging|production> <VERSION_ID>" >&2
  exit 64
fi

if [[ -z "$VERSION_ID" ]]; then
  echo "A Cloudflare Worker VERSION_ID is required. Find it in the GitHub Actions summary or Cloudflare Workers > Deployments." >&2
  exit 64
fi

bunx wrangler rollback "$VERSION_ID" --env "$ENVIRONMENT"
echo "Rollback requested for $ENVIRONMENT to Worker version $VERSION_ID."
