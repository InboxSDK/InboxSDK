import crypto from 'crypto';

const whitelist = new Set([
  'streak'
]);

const appIdRegex = /^sdk_(.{5,15})_([0-9a-f]{10})$/;

export default function isValidAppId(appId) {
  if (whitelist.has(appId)) return true;

  const m = appIdRegex.exec(appId);
  if (!m) return false;

  const name = m[1], hash = m[2];

  const shasum = crypto.createHash('sha1');
  shasum.update(name);
  return shasum.digest('hex').slice(0, 10) === hash;
}
