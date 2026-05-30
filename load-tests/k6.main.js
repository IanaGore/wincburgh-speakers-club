import http from 'k6/http';
import { sleep } from 'k6';
import { thresholds, scenarios, SUPABASE_URL, MEMBER_PASS, ADMIN_PASS, MEMBER_COUNT, ADMIN_COUNT, memberEmail, adminEmail } from './k6.config.js';
import { publicScenario } from './scenarios/public.js';
import { memberScenario } from './scenarios/member.js';
import { adminScenario }  from './scenarios/admin.js';

// Re-export scenario functions so k6 can find them by name
export { publicScenario, memberScenario, adminScenario };

export const options = {
  thresholds,
  scenarios,
  cloud: {
    projectID: __ENV.K6_CLOUD_PROJECT_ID ? Number(__ENV.K6_CLOUD_PROJECT_ID) : undefined,
    name: 'Speakers Club Portal — Pre-session load',
  },
};

// Pre-authenticate all VUs before the test starts.
// Returns { memberTokens: string[], adminTokens: string[] } indexed 0-based (__VU - 1).
// Sequential with 300ms gaps to stay well under Supabase's auth rate limit.
export function setup() {
  const anonKey = __ENV.SUPABASE_ANON_KEY;
  const headers = { 'Content-Type': 'application/json', 'apikey': anonKey };

  function authenticate(email, password) {
    const res = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email, password }),
      { headers }
    );
    if (res.status !== 200) {
      console.warn(`setup: auth failed for ${email} — status ${res.status}`);
      return null;
    }
    const { access_token, user } = res.json();
    return { token: access_token, userId: user.id };
  }

  console.log(`Authenticating ${MEMBER_COUNT} member accounts...`);
  const memberTokens = [];
  for (let i = 1; i <= MEMBER_COUNT; i++) {
    memberTokens.push(authenticate(memberEmail(i), MEMBER_PASS));
    sleep(0.3); // 300ms gap — stays under Supabase's ~10 req/s auth limit
  }

  console.log(`Authenticating ${ADMIN_COUNT} admin accounts...`);
  const adminTokens = [];
  for (let i = 1; i <= ADMIN_COUNT; i++) {
    adminTokens.push(authenticate(adminEmail(i), ADMIN_PASS));
    sleep(0.3);
  }

  const memberOk = memberTokens.filter(t => t !== null).length;
  const adminOk  = adminTokens.filter(t => t !== null).length;
  console.log(`Setup complete: ${memberOk}/${MEMBER_COUNT} member tokens, ${adminOk}/${ADMIN_COUNT} admin tokens`);

  return { memberTokens, adminTokens };
}
