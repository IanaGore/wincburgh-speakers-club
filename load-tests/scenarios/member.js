import http from 'k6/http';
import { sleep, check } from 'k6';
import {
  BASE_URL, SUPABASE_URL,
  ASSIGNMENT_ID,
  volunteerSuccessRate, dashboardDuration,
} from '../k6.config.js';

// data is provided by setup() in k6.main.js
export function memberScenario(data) {
  // ── 1. Get pre-fetched token for this VU ──────────────────────
  const auth = data.memberTokens[__VU - 1];
  if (!auth) { sleep(2); return; } // account failed to auth during setup

  const { token: access_token, userId: memberId } = auth;
  const authHeaders = {
    'Authorization': `Bearer ${access_token}`,
    'apikey': __ENV.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  const cookieHeader = { 'Cookie': `sb-access-token=${access_token}` };

  sleep(Math.random() * 2 + 1);

  // ── 2. Dashboard ──────────────────────────────────────────────
  let res = http.get(`${BASE_URL}/member/dashboard`, {
    headers: cookieHeader,
    tags: { scenario: 'member' },
  });
  dashboardDuration.add(res.timings.duration);
  check(res, { 'dashboard 200': r => r.status === 200 });
  sleep(Math.random() * 5 + 3);

  // ── 3. Speeches page ─────────────────────────────────────────
  res = http.get(`${BASE_URL}/member/speeches`, {
    headers: cookieHeader,
    tags: { scenario: 'member' },
  });
  check(res, { 'speeches 200': r => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // ── 4. Volunteer — claim open assignment slot ─────────────────
  if (!ASSIGNMENT_ID) { volunteerSuccessRate.add(true); }

  if (ASSIGNMENT_ID) {
    const claimRes = http.patch(
      `${SUPABASE_URL}/rest/v1/meeting_assignments?id=eq.${ASSIGNMENT_ID}&member_id=is.null`,
      JSON.stringify({ member_id: memberId }),
      { headers: authHeaders, tags: { scenario: 'member', name: 'volunteer_write' } }
    );
    const claimed = check(claimRes, { 'volunteer claim 2xx': r => r.status >= 200 && r.status < 300 });
    volunteerSuccessRate.add(claimed);

    sleep(1);

    // ── 5. Drop role so next VU can claim it ───────────────────
    http.patch(
      `${SUPABASE_URL}/rest/v1/meeting_assignments?id=eq.${ASSIGNMENT_ID}&member_id=eq.${memberId}`,
      JSON.stringify({ member_id: null }),
      { headers: authHeaders, tags: { scenario: 'member', name: 'drop_role' } }
    );
  }

  sleep(Math.random() * 3 + 2);

  // ── 6. Dashboard reload ───────────────────────────────────────
  res = http.get(`${BASE_URL}/member/dashboard`, {
    headers: cookieHeader,
    tags: { scenario: 'member' },
  });
  dashboardDuration.add(res.timings.duration);
  check(res, { 'dashboard reload 200': r => r.status === 200 });
  sleep(Math.random() * 2 + 1);
}
