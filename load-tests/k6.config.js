import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────
export const volunteerSuccessRate = new Rate('volunteer_success_rate');
export const dashboardDuration    = new Trend('dashboard_duration', true);
export const homeDuration         = new Trend('home_duration', true);

// ── Environment ───────────────────────────────────────────────────
export const BASE_URL      = __ENV.TARGET_URL      || 'http://localhost:3000';
export const SUPABASE_URL  = __ENV.SUPABASE_URL;
export const MEMBER_EMAIL  = __ENV.MEMBER_EMAIL;
export const MEMBER_PASS   = __ENV.MEMBER_PASSWORD;
export const ADMIN_EMAIL   = __ENV.ADMIN_EMAIL;
export const ADMIN_PASS    = __ENV.ADMIN_PASSWORD;
export const MEETING_ID    = __ENV.TEST_MEETING_ID;
export const ASSIGNMENT_ID = __ENV.TEST_ASSIGNMENT_ID;
export const NEWS_ID       = __ENV.TEST_NEWS_ID;

// ── Thresholds ────────────────────────────────────────────────────
export const thresholds = {
  http_req_duration:       ['p(95)<2000', 'p(99)<4000'],
  http_req_failed:         ['rate<0.01'],
  volunteer_success_rate:  ['rate>0.99'],
};

// ── Scenario definitions ──────────────────────────────────────────
export const scenarios = {
  public_browse: {
    executor:        'ramping-vus',
    startVUs:        0,
    stages: [
      { duration: '30s', target: 15 },
      { duration: '2m',  target: 15 },
      { duration: '30s', target: 0  },
    ],
    exec: 'publicScenario',
    gracefulRampDown: '10s',
  },
  member_session: {
    executor:        'ramping-vus',
    startVUs:        0,
    stages: [
      { duration: '30s', target: 20 },
      { duration: '2m',  target: 20 },
      { duration: '30s', target: 0  },
    ],
    exec: 'memberScenario',
    gracefulRampDown: '10s',
  },
  admin_session: {
    executor:        'ramping-vus',
    startVUs:        0,
    stages: [
      { duration: '30s', target: 3  },
      { duration: '2m',  target: 3  },
      { duration: '30s', target: 0  },
    ],
    exec: 'adminScenario',
    gracefulRampDown: '10s',
  },
};
