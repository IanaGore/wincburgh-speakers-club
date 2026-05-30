#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.load-test"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.load-test not found. Copy load-tests/.env.load-test.example to .env.load-test and fill in values."
  exit 1
fi

# Source env vars
set -a
source "$ENV_FILE"
set +a

# Validate required vars
for var in TARGET_URL SUPABASE_URL SUPABASE_ANON_KEY MEMBER_EMAIL MEMBER_PASSWORD ADMIN_EMAIL ADMIN_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is not set in .env.load-test"
    exit 1
  fi
done

TIMESTAMP=$(date +%Y-%m-%d-%H-%M)
RESULTS_FILE="${SCRIPT_DIR}/results/${TIMESTAMP}.json"

echo "Running load test against: $TARGET_URL"
echo "Results will be saved to: $RESULTS_FILE"
echo ""

k6 run \
  --out "json=${RESULTS_FILE}" \
  "${SCRIPT_DIR}/k6.main.js"
