# Grafana Cloud Observability — Sub-project 1 Design

**Date:** 2026-05-30
**Scope:** k6 Cloud integration + Uptime monitoring
**Target:** Grafana Cloud free plan

---

## Goals

1. Run k6 load tests on Grafana Cloud infrastructure (no local k6 needed)
2. Stream live metrics into Grafana dashboards during a run
3. Monitor uptime of key routes every minute from a UK probe

---

## k6 Cloud Integration

### What changes

**`load-tests/k6.main.js`** — add a `cloud` options block alongside existing thresholds/scenarios:

```js
export const options = {
  thresholds,
  scenarios,
  cloud: {
    projectID: 3812345, // replace with real Grafana Cloud project ID
    name: 'Speakers Club Portal — Pre-session load',
  },
};
```

No changes to scenario scripts (`public.js`, `member.js`, `admin.js`) — they are already k6 Cloud compatible.

**`load-tests/run.sh`** — add a `cloud` mode argument:

- `./load-tests/run.sh` → runs locally as before, reads `.env.load-test`
- `./load-tests/run.sh cloud` → runs `k6 cloud load-tests/k6.main.js`, env vars sourced from Grafana Cloud secrets store

### Credentials in Grafana Cloud

All environment variables (TARGET_URL, SUPABASE_URL, SUPABASE_ANON_KEY, MEMBER_EMAIL, MEMBER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_MEETING_ID, TEST_ASSIGNMENT_ID, TEST_NEWS_ID) are stored in:

**Grafana Cloud → k6 → Project Settings → Environment Variables**

These are injected automatically at run time. The `.env.load-test` file is only needed for local runs.

### VU-hour budget

- Free plan: 50 VU-hours/month
- Per run: 38 VUs × 3 minutes = ~1.9 VU-hours
- Budget: ~26 full runs per month

---

## Uptime Monitoring

### Health endpoint

New route: `GET /api/health`

- Returns `200 { "ok": true, "ts": "<ISO timestamp>" }` when healthy
- Makes one Supabase query (`select 1 from profiles limit 1`) to confirm DB connectivity
- Returns `503 { "ok": false, "error": "db" }` if the Supabase query fails
- No auth required — uses the anon Supabase client
- Must respond in < 2s

**File:** `src/app/api/health/route.ts`

### Synthetic Monitoring probes

Configured in Grafana Cloud UI (no code). Three HTTP checks:

| Route | Expected status | Frequency | Probe |
|---|---|---|---|
| `GET /` | 200 | 1 min | London |
| `GET /login` | 200 | 1 min | London |
| `GET /api/health` | 200 | 1 min | London |

Alert condition: notify (Grafana alerting) if any probe returns non-2xx for 2 consecutive checks (2-minute grace to avoid noise from transient errors).

---

## Out of Scope

- App-level OpenTelemetry traces (Sub-project 2)
- Frontend error capture via Grafana Faro (Sub-project 2)
- Multiple probe regions (paid plan feature)
- k6 test scheduling via Grafana Cloud (manual trigger only)
