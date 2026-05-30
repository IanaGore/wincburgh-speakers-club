#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-local}"

if [[ "$MODE" == "cloud" ]]; then
  # Cloud mode — reads .env.load-test and passes all vars explicitly via --env flags.
  # k6 cloud does not inherit the local shell environment by default.
  ENV_FILE="${SCRIPT_DIR}/../.env.load-test"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: .env.load-test not found. Copy load-tests/.env.load-test.example to .env.load-test and fill in values."
    exit 1
  fi
  set -a; source "$ENV_FILE"; set +a

  if [[ -z "${K6_CLOUD_TOKEN:-}" ]]; then
    echo "ERROR: K6_CLOUD_TOKEN is not set in .env.load-test. Get it from Grafana Cloud → Testing & synthetics → Performance → Settings."
    exit 1
  fi

  echo "Running load test on Grafana Cloud k6..."
  k6 cloud run \
    --env TARGET_URL="${TARGET_URL}" \
    --env SUPABASE_URL="${SUPABASE_URL}" \
    --env SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
    --env MEMBER_EMAIL="${MEMBER_EMAIL}" \
    --env MEMBER_PASSWORD="${MEMBER_PASSWORD}" \
    --env ADMIN_EMAIL="${ADMIN_EMAIL}" \
    --env ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
    --env TEST_MEETING_ID="${TEST_MEETING_ID:-}" \
    --env TEST_ASSIGNMENT_ID="${TEST_ASSIGNMENT_ID:-}" \
    --env TEST_NEWS_ID="${TEST_NEWS_ID:-}" \
    --env K6_CLOUD_PROJECT_ID="${K6_CLOUD_PROJECT_ID:-}" \
    "${SCRIPT_DIR}/k6.main.js"
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
