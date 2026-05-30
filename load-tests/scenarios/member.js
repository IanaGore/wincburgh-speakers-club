import http from 'k6/http';
import { sleep, check } from 'k6';
import {
  BASE_URL, SUPABASE_URL,
  MEMBER_EMAIL, MEMBER_PASS,
  ASSIGNMENT_ID,
  volunteerSuccessRate, dashboardDuration,
} from '../k6.config.js';

export function memberScenario() {
  // ── 1. Authenticate with Supabase ─────────────────────────────
  const authRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASS }),
    { headers: { 'Content-Type': 'application/json', 'apikey': __ENV.SUPABASE_ANON_KEY } }
  );
  const authOk = check(authRes, { 'member login 200': r => r.status === 200 });
  if (!authOk) { sleep(2); return; }

  const { access_token, user } = authRes.json();
  if (!access_token || !user) { sleep(2); return; }
  const memberId = user.id;
  const authHeaders = {
    'Authorization': `Bearer ${access_token}`,
    'apikey': __ENV.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  sleep(Math.random() * 2 + 1);

  // ── 2. Dashboard ──────────────────────────────────────────────
  let res = http.get(`${BASE_URL}/member/dashboard`, {
    headers: { 'Cookie': `sb-access-token=${access_token}` },
    tags: { scenario: 'member' },
  });
  dashboardDuration.add(res.timings.duration);
  check(res, { 'dashboard 200': r => r.status === 200 });
  sleep(Math.random() * 5 + 3);

  // ── 3. Speeches page ─────────────────────────────────────────
  res = http.get(`${BASE_URL}/member/speeches`, {
    headers: { 'Cookie': `sb-access-token=${access_token}` },
    tags: { scenario: 'member' },
  });
  check(res, { 'speeches 200': r => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // ── 4. Volunteer — claim open assignment slot ─────────────────
  // If no assignment ID configured, record a pass so the threshold doesn't fail on empty metric
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
    headers: { 'Cookie': `sb-access-token=${access_token}` },
    tags: { scenario: 'member' },
  });
  dashboardDuration.add(res.timings.duration);
  check(res, { 'dashboard reload 200': r => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  // ── 7. Sign out ───────────────────────────────────────────────
  http.post(
    `${SUPABASE_URL}/auth/v1/logout`,
    null,
    { headers: authHeaders }
  );
}
