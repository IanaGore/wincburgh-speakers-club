#!/usr/bin/env bash
# Creates load test accounts in Supabase and writes .env.load-test
# Usage: ./load-tests/setup-test-users.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
ENV_FILE="${ROOT_DIR}/.env.load-test"

# ── Config ─────────────────────────────────────────────────────────
MEMBER_COUNT=20   # must match member_session maxVUs in k6.config.js
ADMIN_COUNT=3     # must match admin_session maxVUs in k6.config.js
MEMBER_PASSWORD="LoadTest!Member2026"
ADMIN_PASSWORD="LoadTest!Admin2026"
MEMBER_PREFIX="loadtest-member"
ADMIN_PREFIX="loadtest-admin"

# ── Read Supabase creds from .env.local ────────────────────────────
ENV_LOCAL="${ROOT_DIR}/.env.local"
if [[ ! -f "$ENV_LOCAL" ]]; then
  echo "ERROR: .env.local not found at ${ENV_LOCAL}"
  echo "Copy .env.local.example and fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

set -a; source "$ENV_LOCAL"; set +a

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SERVICE_ROLE_KEY" || -z "$ANON_KEY" ]]; then
  echo "ERROR: Missing required env vars in .env.local:"
  echo "  NEXT_PUBLIC_SUPABASE_URL"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "  SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# ── Read TARGET_URL (Vercel) ───────────────────────────────────────
TARGET_URL="${TARGET_URL:-}"
if [[ -z "$TARGET_URL" ]]; then
  read -r -p "Enter your Vercel production URL (e.g. https://wincburgh-speakers-club.vercel.app): " TARGET_URL
  TARGET_URL="${TARGET_URL%/}"  # strip trailing slash
fi

# ── Read optional test IDs ─────────────────────────────────────────
read -r -p "Enter a TEST_MEETING_ID (leave blank to skip): " TEST_MEETING_ID
read -r -p "Enter a TEST_ASSIGNMENT_ID for volunteer test (leave blank to skip): " TEST_ASSIGNMENT_ID
read -r -p "Enter a TEST_NEWS_ID (leave blank to skip): " TEST_NEWS_ID

# ── Read K6_CLOUD_TOKEN ────────────────────────────────────────────
read -r -p "Enter your K6_CLOUD_TOKEN (leave blank to skip cloud mode): " K6_CLOUD_TOKEN
read -r -p "Enter your K6_CLOUD_PROJECT_ID (leave blank to skip): " K6_CLOUD_PROJECT_ID

echo ""
echo "Creating ${MEMBER_COUNT} member accounts and ${ADMIN_COUNT} admin accounts..."

# ── Helper: create user via Supabase Admin API ─────────────────────
create_user() {
  local email="$1"
  local password="$2"
  local full_name="$3"

  local response
  response=$(curl -sf -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${email}\",
      \"password\": \"${password}\",
      \"email_confirm\": true,
      \"user_metadata\": { \"full_name\": \"${full_name}\" }
    }" 2>&1) || true

  local user_id
  user_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [[ -z "$user_id" ]]; then
    # User may already exist — try to get existing ID
    local list_response
    list_response=$(curl -sf "${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "apikey: ${SERVICE_ROLE_KEY}" 2>/dev/null) || true
    user_id=$(echo "$list_response" | grep -o "\"email\":\"${email}\"" | head -1 | xargs -I{} \
      bash -c "echo '$list_response'" | python3 -c "
import sys, json
data = json.load(sys.stdin)
users = data.get('users', [])
for u in users:
    if u.get('email') == '${email}':
        print(u['id'])
        break
" 2>/dev/null || echo "")
  fi

  if [[ -z "$user_id" ]]; then
    echo "  WARN: Could not create or find ${email} — skipping"
    return
  fi

  # Upsert profile with full_name
  curl -sf -X POST "${SUPABASE_URL}/rest/v1/profiles" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{\"id\": \"${user_id}\", \"full_name\": \"${full_name}\", \"is_admin\": false}" \
    > /dev/null 2>&1 || true

  echo "  ✓ ${email} (${user_id})"
}

create_admin() {
  local email="$1"
  local password="$2"
  local full_name="$3"

  local response
  response=$(curl -sf -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${email}\",
      \"password\": \"${password}\",
      \"email_confirm\": true,
      \"user_metadata\": { \"full_name\": \"${full_name}\" }
    }" 2>&1) || true

  local user_id
  user_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [[ -z "$user_id" ]]; then
    # Already exists — find ID from list
    local list_response
    list_response=$(curl -sf "${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "apikey: ${SERVICE_ROLE_KEY}" 2>/dev/null) || true
    user_id=$(echo "$list_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
users = data.get('users', [])
for u in users:
    if u.get('email') == '${email}':
        print(u['id'])
        break
" 2>/dev/null || echo "")
  fi

  if [[ -z "$user_id" ]]; then
    echo "  WARN: Could not create or find ${email} — skipping"
    return
  fi

  # Upsert profile with is_admin=true
  curl -sf -X POST "${SUPABASE_URL}/rest/v1/profiles" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{\"id\": \"${user_id}\", \"full_name\": \"${full_name}\", \"is_admin\": true}" \
    > /dev/null 2>&1 || true

  echo "  ✓ ${email} (${user_id})"
}

# ── Create member accounts ─────────────────────────────────────────
echo ""
echo "Member accounts:"
for i in $(seq -f "%02g" 1 $MEMBER_COUNT); do
  create_user "${MEMBER_PREFIX}-${i}@loadtest.invalid" "$MEMBER_PASSWORD" "Load Test Member ${i}"
done

# ── Create admin accounts ──────────────────────────────────────────
echo ""
echo "Admin accounts:"
for i in $(seq -f "%02g" 1 $ADMIN_COUNT); do
  create_admin "${ADMIN_PREFIX}-${i}@loadtest.invalid" "$ADMIN_PASSWORD" "Load Test Admin ${i}"
done

# ── Write .env.load-test ───────────────────────────────────────────
echo ""
echo "Writing ${ENV_FILE}..."

cat > "$ENV_FILE" << EOF
# Auto-generated by setup-test-users.sh — $(date)
# Re-run setup-test-users.sh to regenerate

TARGET_URL=${TARGET_URL}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${ANON_KEY}

# Per-VU credentials — member VU index 1-${MEMBER_COUNT}, admin VU index 1-${ADMIN_COUNT}
# The k6 scenarios use __VU to pick the right account automatically
MEMBER_EMAIL_PREFIX=${MEMBER_PREFIX}
MEMBER_PASSWORD=${MEMBER_PASSWORD}
ADMIN_EMAIL_PREFIX=${ADMIN_PREFIX}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
MEMBER_COUNT=${MEMBER_COUNT}
ADMIN_COUNT=${ADMIN_COUNT}

TEST_MEETING_ID=${TEST_MEETING_ID:-}
TEST_ASSIGNMENT_ID=${TEST_ASSIGNMENT_ID:-}
TEST_NEWS_ID=${TEST_NEWS_ID:-}

# Grafana Cloud k6
K6_CLOUD_TOKEN=${K6_CLOUD_TOKEN:-}
K6_CLOUD_PROJECT_ID=${K6_CLOUD_PROJECT_ID:-}
EOF

echo "Done! .env.load-test written."
echo ""
echo "Next steps:"
echo "  1. Run a local test:  ./load-tests/run.sh"
echo "  2. Run a cloud test:  ./load-tests/run.sh cloud"
