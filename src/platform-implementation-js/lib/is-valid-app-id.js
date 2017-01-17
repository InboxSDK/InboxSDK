/* @flow */

import Sha1 from 'sha.js/sha1';

function grandfatherHash(x) {
  const hasher = new Sha1();
  hasher.update('YlEHtGl72+c'+x);
  return hasher.digest('hex');
}

const whitelist = new Set([
  'b540a2819e4b26823288046869e5577852178d69', // streak
  '220077d641d018c9707db9e0fa31f52e687bffc3', // dropbox
  '1e9084cb394369dcdfd43cfcd84d17b78b0903dd', // Rockwell
  'a9b816b86b6085eb0b80315da6b2297ff30cf7b6', // Screenleap
  '5140e277522fd95ece3d540c94b97f443bcc3256', // docsend
  'b56a2d6e6f650ed6eae78774d3b1f02d969d8485', // giphy
  'bc6308648a588258f31f8f4b64f7c4652b6fcaac', // stripe
  '4cb8e6bd1aab0b4b05c7f07fbe8332b842009358' // godMode
]);

const appIdRegex = /^sdk_(.{5,15})_([0-9a-f]{10})$/;

export default function isValidAppId(appId: string): boolean {
  if (whitelist.has(grandfatherHash(appId))) return true;

  const m = appIdRegex.exec(appId);
  if (!m) return false;

  const name = m[1], hash = m[2];

  const shasum = new Sha1();
  shasum.update(name);
  return shasum.digest('hex').slice(0, 10) === hash;
}
