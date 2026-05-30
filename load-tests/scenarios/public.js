import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL, NEWS_ID, homeDuration } from '../k6.config.js';

export function publicScenario() {
  const params = { tags: { scenario: 'public' } };

  // Homepage
  let res = http.get(`${BASE_URL}/`, params);
  homeDuration.add(res.timings.duration);
  check(res, { 'home 200': r => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // About
  res = http.get(`${BASE_URL}/about`, params);
  check(res, { 'about 200': r => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // Meetings list
  res = http.get(`${BASE_URL}/meetings`, params);
  check(res, { 'meetings 200': r => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // News list
  res = http.get(`${BASE_URL}/news`, params);
  check(res, { 'news list 200': r => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  // News detail
  if (NEWS_ID) {
    res = http.get(`${BASE_URL}/news/${NEWS_ID}`, params);
    check(res, { 'news detail 200': r => r.status === 200 });
    sleep(Math.random() * 3 + 2);
  }

  // RSVP form submit
  res = http.post(
    `${BASE_URL}/signup`,
    {
      first_name:  'Load',
      last_name:   'Tester',
      email:       `loadtest+${Date.now()}@example.com`,
      experience:  'none',
    },
    { ...params, tags: { scenario: 'public', name: 'rsvp_submit' } }
  );
  // 200 (success page) or 303 (redirect after submit) are both valid
  check(res, { 'rsvp accepted': r => r.status === 200 || r.status === 303 });
  sleep(Math.random() * 3 + 2);
}
