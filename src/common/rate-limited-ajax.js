/* @flow */
//jshint ignore:start

import {defn, defonce} from 'ud';
import delay from './delay';
import ajax from './ajax';
import type {ajaxOpts, ajaxResponse} from './ajax';

export type RateLimit = {
  max: number;
  period: number;
};

const recentRequestsByDomain: Map<string, Array<number>> = defonce(module, () => new Map());

// Automatically rate-limits requests per domain.
async function rateLimitedAjax(opts: ajaxOpts, limit: RateLimit={max: 10, period: 1000}): Promise<ajaxResponse> {
  const m = /^(?:https?:)?\/\/([^/]+)\//.exec(opts.url);
  const domain = m ? m[1] : '';
  while (true) {
    const recentRequests = recentRequestsByDomain.get(domain) || [];
    const now = Date.now();
    const requestsWithinPeriod = recentRequests.filter(time => time > now - limit.period).slice(0, limit.max);
    if (requestsWithinPeriod.length < limit.max) {
      requestsWithinPeriod.push(now);
      recentRequestsByDomain.set(domain, requestsWithinPeriod);
      break;
    }
    // Wait until the oldest request within the given period is done.
    await requestsWithinPeriod[0] + limit.period;
  }
  return ajax(opts);
}

export default defn(module, rateLimitedAjax);
