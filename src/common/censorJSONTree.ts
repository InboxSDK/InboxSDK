import isStreakAppId from '../platform-implementation-js/lib/isStreakAppId';

const hasStreakInstalled = () => {
  const appIds = JSON.parse(
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-inboxsdk-active-app-ids')) ||
      '[]'
  );
  return appIds.find(({ appId }: any) => isStreakAppId(appId));
};

export default function censorJSONTree(object: any): string {
  return JSON.stringify(object, (key, value) => {
    if (typeof value !== 'string' || value.length <= 10) return value;

    return hasStreakInstalled() ? `${value.substring(0, 10)}...` : '...';
  });
}
