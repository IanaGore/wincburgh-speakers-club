# Grafana Cloud Observability — Sub-project 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing k6 load test into Grafana Cloud's hosted runner and add a `/api/health` endpoint for Grafana Synthetic Monitoring uptime probes.

**Architecture:** Two independent changes — (1) add a `cloud` options block to `k6.main.js` and a `cloud` mode to `run.sh` so tests can be triggered via `k6 cloud`; (2) a new Next.js route handler at `/api/health` that returns 200/503 based on a live Supabase ping. Synthetic Monitoring probes are configured in the Grafana Cloud UI (no code).

**Tech Stack:** k6 Cloud (Grafana), Next.js 16 App Router route handlers, `@supabase/ssr` anon client

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `load-tests/k6.main.js` | Modify | Add `cloud` options block with project name |
| `load-tests/run.sh` | Modify | Add `cloud` mode argument |
| `load-tests/.env.load-test.example` | Modify | Add `K6_CLOUD_TOKEN` var |
| `src/app/api/health/route.ts` | Create | Health check endpoint for uptime probes |

---

## Task 1: Add k6 Cloud options block

**Files:**
- Modify: `load-tests/k6.main.js`

The `cloud` block tells Grafana Cloud the project name shown in the k6 dashboard. `projectID` must be filled in from Grafana Cloud → k6 → Your Project → Settings. The placeholder value `0` will cause `k6 cloud` to prompt for it — the implementer should leave it as a clearly-named env var read.

- [ ] **Step 1: Read the current file**

```bash
cat "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal/load-tests/k6.main.js"
```

- [ ] **Step 2: Replace `options` export with cloud-aware version**

Replace the entire file contents with:

```js
import { thresholds, scenarios } from './k6.config.js';
import { publicScenario } from './scenarios/public.js';
import { memberScenario } from './scenarios/member.js';
import { adminScenario }  from './scenarios/admin.js';

// Re-export scenario functions so k6 can find them by name
export { publicScenario, memberScenario, adminScenario };

export const options = {
  thresholds,
  scenarios,
  cloud: {
    // Find your project ID in Grafana Cloud → k6 → Project Settings
    // Set K6_CLOUD_PROJECT_ID in Grafana Cloud environment variables
    projectID: __ENV.K6_CLOUD_PROJECT_ID ? Number(__ENV.K6_CLOUD_PROJECT_ID) : undefined,
    name: 'Speakers Club Portal — Pre-session load',
  },
};
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal"
git add load-tests/k6.main.js
git commit -m "feat: add k6 Cloud options block for Grafana Cloud runner"
```

---

## Task 2: Add cloud mode to run.sh

**Files:**
- Modify: `load-tests/run.sh`
- Modify: `load-tests/.env.load-test.example`

`k6 cloud` authenticates via the `K6_CLOUD_TOKEN` environment variable (Grafana Cloud API token). In cloud mode we skip the local `.env.load-test` entirely — credentials live in Grafana Cloud's environment variable store and are injected at run time.

- [ ] **Step 1: Read the current run.sh**

```bash
cat "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal/load-tests/run.sh"
```

- [ ] **Step 2: Replace run.sh with cloud-mode-aware version**

```bash
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
```

- [ ] **Step 3: Append K6_CLOUD_TOKEN to the example env file**

Read `load-tests/.env.load-test.example`, then append:

```
# Grafana Cloud k6 token — needed for cloud mode only (./run.sh cloud)
# Get it from: Grafana Cloud → k6 → API Token
K6_CLOUD_TOKEN=your-grafana-cloud-k6-token-here

# Grafana Cloud project ID — set this in Grafana Cloud environment variables, not here
# K6_CLOUD_PROJECT_ID=12345
```

- [ ] **Step 4: Ensure run.sh is executable**

```bash
chmod +x "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal/load-tests/run.sh"
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal"
git add load-tests/run.sh load-tests/.env.load-test.example
git commit -m "feat: add cloud mode to load test runner for Grafana Cloud k6"
```

---

## Task 3: Health check route handler

**Files:**
- Create: `src/app/api/health/route.ts`

This endpoint is called by Grafana Synthetic Monitoring every minute. It must not require auth (anon Supabase client), must respond in under 2s, and must return 503 if the Supabase connection is broken.

The anon client is instantiated directly (not via `createClient()` from `src/utils/supabase/server.ts`) because the server client requires cookie handling which is unnecessary for a health check and would add overhead.

- [ ] **Step 1: Create the directory and route file**

Create `src/app/api/health/route.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// No caching — health checks must always hit the origin
export const revalidate = 0

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'db' },
      { status: 503 }
    )
  }

  return NextResponse.json(
    { ok: true, ts: new Date().toISOString() },
    { status: 200 }
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal"
npx tsc --noEmit 2>&1
```

Expected: no errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Test it locally**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000/api/health | jq .
```

Expected output (when Supabase is reachable):
```json
{ "ok": true, "ts": "2026-05-30T..." }
```

Kill the dev server after verifying:
```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal"
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health endpoint for Grafana Synthetic Monitoring"
```

---

## Task 4: Manual setup checklist (no code — Grafana Cloud UI)

This task is human-only — it cannot be automated. Complete these steps in the Grafana Cloud UI after the code is deployed.

- [ ] **Step 1: Get your k6 API token**

Grafana Cloud → k6 → API Tokens → New token. Copy it. Add it to your local `.env.load-test` as `K6_CLOUD_TOKEN`.

- [ ] **Step 2: Get your k6 project ID**

Grafana Cloud → k6 → Your project → Settings. Copy the numeric project ID. Add it to Grafana Cloud → k6 → Your project → Environment Variables as `K6_CLOUD_PROJECT_ID`.

- [ ] **Step 3: Add all test credentials to Grafana Cloud environment variables**

Grafana Cloud → k6 → Your project → Environment Variables. Add each of these:

| Variable | Value |
|---|---|
| `TARGET_URL` | Your production Vercel URL |
| `SUPABASE_URL` | `https://vcnikryfcmvaacaiuior.supabase.co` |
| `SUPABASE_ANON_KEY` | From Supabase → Project Settings → API |
| `MEMBER_EMAIL` | Test member account email |
| `MEMBER_PASSWORD` | Test member account password |
| `ADMIN_EMAIL` | Test admin account email |
| `ADMIN_PASSWORD` | Test admin account password |
| `TEST_MEETING_ID` | UUID of upcoming test meeting |
| `TEST_ASSIGNMENT_ID` | UUID of open assignment on that meeting |
| `TEST_NEWS_ID` | UUID of any published news post |
| `K6_CLOUD_PROJECT_ID` | Your project ID (from Step 2) |

- [ ] **Step 4: Run a test via Grafana Cloud**

```bash
cd "/Users/iangore/Documents/Claude/Projects/Speakers Club/Website/speakers-club-portal"
K6_CLOUD_TOKEN=your-token ./load-tests/run.sh cloud
```

Expected: k6 prints a URL to the live Grafana Cloud results dashboard. Open it to see metrics streaming.

- [ ] **Step 5: Configure Synthetic Monitoring**

Grafana Cloud → Synthetic Monitoring → Add check → HTTP. Add three checks:

| Job name | URL | Expected status | Frequency | Probe |
|---|---|---|---|---|
| `homepage` | `https://your-vercel-url.vercel.app/` | 200 | 1m | London |
| `login-page` | `https://your-vercel-url.vercel.app/login` | 200 | 1m | London |
| `health-api` | `https://your-vercel-url.vercel.app/api/health` | 200 | 1m | London |

- [ ] **Step 6: Configure alert**

Grafana Cloud → Alerting → Alert rules → New rule. Set:
- Condition: any synthetic monitoring check returns non-2xx
- For: 2 minutes (2 consecutive failures before alerting)
- Notify: your email via the default Grafana notification channel
