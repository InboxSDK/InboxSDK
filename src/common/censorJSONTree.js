/* @flow */

import isStreakAppId from '../platform-implementation-js/lib/is-streak-app-id';

const hasStreakInstalled = () => {
  const appIds = JSON.parse(
    global.document &&
    ((document.documentElement:any):HTMLElement).getAttribute('data-inboxsdk-active-app-ids') || '[]'
  );
  return appIds.find(({appId}) => isStreakAppId(appId));
};

export default function censorJSONTree(object: any): string {
  return JSON.stringify(object, (key, value) => {
    if (typeof value !== 'string' || value.length <= 10) return value;

    return hasStreakInstalled() ? `${value.substring(0, 10)}...` : '...';
  });
}
