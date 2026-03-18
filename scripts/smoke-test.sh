#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_MODE="${AUTH_MODE:-cookie}"

echo "Smoke test against ${BASE_URL}"

curl -fsS "${BASE_URL}/api/health/live" >/dev/null
curl -fsS "${BASE_URL}/api/health/ready" >/dev/null

if [ "${AUTH_MODE}" = "api_key" ]; then
  : "${API_KEY:?API_KEY is required when AUTH_MODE=api_key}"
  curl -fsS -H "x-api-key: ${API_KEY}" "${BASE_URL}/api/v1/tickets?limit=1" >/dev/null
else
  : "${ACCESS_COOKIE:?ACCESS_COOKIE is required when AUTH_MODE=cookie}"
  curl -fsS -H "Cookie: access_token=${ACCESS_COOKIE}" "${BASE_URL}/api/v1/auth/me" >/dev/null
  curl -fsS -H "Cookie: access_token=${ACCESS_COOKIE}" "${BASE_URL}/api/v1/tickets?limit=1" >/dev/null
fi

echo "Smoke test passed"
