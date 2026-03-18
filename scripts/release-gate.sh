#!/usr/bin/env bash
set -euo pipefail

pnpm db:generate
pnpm -F web type-check
pnpm test:release-blocking
pnpm build
