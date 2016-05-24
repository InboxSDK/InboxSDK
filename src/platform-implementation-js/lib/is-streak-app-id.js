/* @flow */

import {createHash} from 'crypto';

function hash(x) {
  const hasher = createHash('sha1');
  hasher.update('5UA6qY1eek'+x);
  return hasher.digest('hex');
}

export default function isStreakAppId(appId: string): boolean {
  // Checks if appId === 'sdk_streak_21e9788951' without putting the appId in
  // the source. Just using a similar technique to is-valid-app-id.
  return hash(appId) === '172fa2bada257e9e449f01665b16b281891cbafa';
}
