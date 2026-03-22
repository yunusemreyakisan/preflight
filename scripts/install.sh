#!/usr/bin/env bash

set -euo pipefail

PACKAGE_NAME="${PREFLIGHT_PACKAGE_NAME:-@yakisan/preflight}"
PACKAGE_VERSION="${PREFLIGHT_VERSION:-latest}"
PACKAGE_SPEC="${PACKAGE_NAME}@${PACKAGE_VERSION}"

log() {
  printf '[preflight] %s\n' "$1"
}

fail() {
  printf '[preflight] %s\n' "$1" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
  fi
}

require_command node
require_command npm

log "Installing ${PACKAGE_SPEC}"

if npm install --global "$PACKAGE_SPEC"; then
  log "Install complete"
  log "Run: preflight scan"
  exit 0
fi

fail "npm install failed. If this machine restricts global installs, re-run with a Node version manager or adjust npm global permissions."
