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
