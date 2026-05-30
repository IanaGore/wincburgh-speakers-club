# Load Test Design — Speakers Club Portal

**Date:** 2026-05-30  
**Tool:** k6  
**Target:** Production Vercel deployment  
**Goal:** Validate page load speed and Supabase query throughput under realistic pre-session traffic

---

## Context

The club has ~22 members per session. Before a meeting, members check the dashboard and volunteer for roles. Public visitors also browse the site around this time. This test simulates that peak window.

---

## Virtual User Groups

Three concurrent scenario groups run in parallel:

| Scenario | VUs | Role |
|---|---|---|
| Public browser | 15 | Anonymous visitors — homepage, about, meetings, news, RSVP form |
| Member session | 20 | Authenticated members — dashboard, speeches, volunteer action (DB write) |
| Admin session | 3 | Authenticated admin — meetings list, meeting detail, signups list |

**Total: 38 VUs**

### Ramp profile
- 0–30s: ramp up from 0 to 38 VUs
- 30s–2m30s: hold at 38 VUs
- 2m30s–3m: ramp down to 0

---

## User Journeys

### Public browser
1. `GET /` — homepage
2. `GET /about`
3. `GET /meetings`
4. `GET /news`
5. `GET /news/[id]` — first news post
6. `POST /signup` (RSVP form submit with fake data)
7. Think time: 2–5s between steps

### Member session
1. `POST` Supabase auth endpoint — email/password login, capture JWT
2. `GET /member/dashboard`
3. `GET /member/speeches`
4. `POST` volunteer server action — claim an open role on the next meeting
5. `GET /member/dashboard` — reload to confirm assignment
6. Supabase auth signout
7. Think time: 3–8s between steps

### Admin session
1. `POST` Supabase auth endpoint — admin login, capture JWT
2. `GET /admin/meetings`
3. `GET /admin/meetings/[id]` — first upcoming meeting
4. `GET /admin/signups`
5. Supabase auth signout
6. Think time: 5–10s between steps

---

## File Structure

```
load-tests/
  k6.config.js          # shared thresholds, base URL, scenario config
  scenarios/
    public.js           # public browser journey
    member.js           # authenticated member journey
    admin.js            # admin journey
  run.sh                # convenience runner — exports env vars, calls k6
  results/              # gitignored — JSON output lands here
```

---

## Credentials

Passed as environment variables — never hardcoded:

| Variable | Purpose |
|---|---|
| `TARGET_URL` | Base URL of the production deployment |
| `MEMBER_EMAIL` | Test member account email |
| `MEMBER_PASSWORD` | Test member account password |
| `ADMIN_EMAIL` | Test admin account email |
| `ADMIN_PASSWORD` | Test admin account password |
| `TEST_MEETING_ID` | UUID of a real upcoming meeting to volunteer against |
| `TEST_NEWS_ID` | UUID of a real news post for the public journey |

Test accounts must be created in Supabase manually before running.

---

## Metrics & Thresholds

| Metric | Threshold |
|---|---|
| `http_req_duration` p95 | < 2000ms |
| `http_req_duration` p99 | < 4000ms |
| `http_req_failed` | < 1% |
| Custom: `volunteer_success_rate` | > 99% |

k6 will exit non-zero if any threshold is breached — suitable for CI use later.

---

## Output

- **Terminal:** k6 summary table (p50/p95/p99 per URL group, error rate, req/s)
- **File:** `load-tests/results/YYYY-MM-DD-HH-MM.json` — full result for offline analysis

---

## Prerequisites

1. k6 installed locally (`brew install k6`)
2. Test member and admin accounts created in Supabase
3. A real upcoming meeting exists in the DB with at least one open role
4. `.env.load-test` file populated with the variables above (gitignored)

---

## Out of Scope

- Browser-rendered Core Web Vitals (Lighthouse/WebPageTest covers this separately)
- Load testing Supabase Storage (image serving via CDN, not a bottleneck)
- Admin write operations (meeting creation, media upload) — these are low-frequency
