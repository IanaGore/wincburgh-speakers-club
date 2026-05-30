import http from 'k6/http';
import { sleep, check } from 'k6';
import {
  BASE_URL, SUPABASE_URL,
  ADMIN_PASS, adminEmail,
  MEETING_ID,
} from '../k6.config.js';

export function adminScenario() {
  // ── 1. Authenticate ───────────────────────────────────────────
  const authRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: adminEmail(__VU), password: ADMIN_PASS }),
    { headers: { 'Content-Type': 'application/json', 'apikey': __ENV.SUPABASE_ANON_KEY } }
  );
  const authOk = check(authRes, { 'admin login 200': r => r.status === 200 });
  if (!authOk) { sleep(2); return; }

  const { access_token } = authRes.json();
  const cookieHeader = { 'Cookie': `sb-access-token=${access_token}` };

  sleep(Math.random() * 3 + 2);

  // ── 2. Meetings list ──────────────────────────────────────────
  let res = http.get(`${BASE_URL}/admin/meetings`, {
    headers: cookieHeader,
    tags: { scenario: 'admin' },
  });
  check(res, { 'admin meetings 200': r => r.status === 200 });
  sleep(Math.random() * 5 + 5);

  // ── 3. Meeting detail ─────────────────────────────────────────
  if (MEETING_ID) {
    res = http.get(`${BASE_URL}/admin/meetings/${MEETING_ID}`, {
      headers: cookieHeader,
      tags: { scenario: 'admin' },
    });
    check(res, { 'admin meeting detail 200': r => r.status === 200 });
    sleep(Math.random() * 5 + 5);
  }

  // ── 4. Signups list ───────────────────────────────────────────
  res = http.get(`${BASE_URL}/admin/signups`, {
    headers: cookieHeader,
    tags: { scenario: 'admin' },
  });
  check(res, { 'admin signups 200': r => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // ── 5. Sign out ───────────────────────────────────────────────
  http.post(
    `${SUPABASE_URL}/auth/v1/logout`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'apikey': __ENV.SUPABASE_ANON_KEY,
      },
    }
  );
}
