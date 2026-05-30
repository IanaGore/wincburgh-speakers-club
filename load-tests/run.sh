#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-local}"

if [[ "$MODE" == "cloud" ]]; then
  # Cloud mode — credentials live in Grafana Cloud environment variable store.
  # K6_CLOUD_TOKEN must be set in the local environment or CI to authenticate.
  if [[ -z "${K6_CLOUD_TOKEN:-}" ]]; then
    echo "ERROR: K6_CLOUD_TOKEN is not set. Get it from Grafana Cloud → k6 → API Token."
    exit 1
  fi
  echo "Running load test on Grafana Cloud k6..."
  k6 cloud "${SCRIPT_DIR}/k6.main.js"
  exit 0
fi

# Local mode (default)
ENV_FILE="${SCRIPT_DIR}/../.env.load-test"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.load-test not found. Copy load-tests/.env.load-test.example to .env.load-test and fill in values."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

for var in TARGET_URL SUPABASE_URL SUPABASE_ANON_KEY MEMBER_EMAIL MEMBER_PASSWORD ADMIN_EMAIL ADMIN_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is not set in .env.load-test"
    exit 1
  fi
done

TIMESTAMP=$(date +%Y-%m-%d-%H-%M)
RESULTS_FILE="${SCRIPT_DIR}/results/${TIMESTAMP}.json"
mkdir -p "${SCRIPT_DIR}/results"

echo "Running load test locally against: $TARGET_URL"
echo "Results will be saved to: $RESULTS_FILE"
echo ""

k6 run \
  --out "json=${RESULTS_FILE}" \
  "${SCRIPT_DIR}/k6.main.js"
