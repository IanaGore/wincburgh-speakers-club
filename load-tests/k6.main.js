import { thresholds, scenarios } from './k6.config.js';
import { publicScenario } from './scenarios/public.js';
import { memberScenario } from './scenarios/member.js';
import { adminScenario }  from './scenarios/admin.js';

// Re-export scenario functions so k6 can find them by name
export { publicScenario, memberScenario, adminScenario };

export const options = { thresholds, scenarios };
