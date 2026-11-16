#!/usr/bin/env bash
# Compiles every piece of frontend JSX (frontend/app.jsx and static/*.jsx) into static/build/
# with the same Babel the browser used. Fails on any syntax error. Needs Node.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build-frontend.js --force
