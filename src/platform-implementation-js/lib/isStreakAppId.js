/* @flow */

import Sha256 from 'sha.js/sha256';

function hash(x) {
  const hasher = new Sha256();
  hasher.update('bdnanNrDjv'+x);
  return hasher.digest('hex').slice(0,32);
}

export default function isStreakAppId(appId: string): boolean {
  // Checks if appId === 'sdk_streak_21e9788951' without putting the appId in
  // the source. Just using a similar technique to is-valid-app-id.
  return hash(appId) === 'f471fe7b7343b47a202437c3962cc335';
}
