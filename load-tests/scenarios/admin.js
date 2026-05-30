import http from 'k6/http';
import { sleep, check } from 'k6';
import {
  BASE_URL,
  MEETING_ID,
} from '../k6.config.js';

// data is provided by setup() in k6.main.js
export function adminScenario(data) {
  // ── 1. Get pre-fetched token for this VU ──────────────────────
  const auth = data.adminTokens[__VU - 1];
  if (!auth) { sleep(2); return; } // account failed to auth during setup

  const { token: access_token } = auth;
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
}
