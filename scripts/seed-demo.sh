#!/usr/bin/env bash
set -euo pipefail
test "${CONFIRM_DEMO_SEED:-}" = yes||{ echo 'Set CONFIRM_DEMO_SEED=yes; this seed replaces local tables.';exit 2;};cd "$(dirname "$0")/../backend";node seed.js

