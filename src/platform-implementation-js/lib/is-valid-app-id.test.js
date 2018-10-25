/* @flow */

import isValidAppId from './is-valid-app-id';

function shouldPass(description, appId) {
  it(description, () => {
    expect(isValidAppId(appId)).toBe(true);
  });
}
function shouldFail(description, appId) {
  it(description, () => {
    expect(isValidAppId(appId)).toBe(false);
  });
}

const grandfathered = [
  'streak',
  'dropbox',
  'Rockwell',
  'Screenleap',
  'docsend',
  'giphy',
  'stripe',
  'godMode'
];

describe('passes', () => {
  shouldPass('streak', 'streak');
  it('all grandfathered appIds', () => {
    grandfathered.forEach(name => {
      expect(isValidAppId(name)).toBe(true);
    });
  });
  shouldPass('good hash', 'sdk_testfoo_2a9c68f994');
  shouldPass('respects case', 'sdk_testFoo_e647eccc5a');
  shouldPass('short test', 'sdk_12345_8cb2237d06');
  shouldPass('long test', 'sdk_12345678901234_a0c55fdf6b');
});

describe('failures', () => {
  shouldFail('nearly whitelisted', 'streak2');
  shouldFail('trailing data', 'sdk_testfoo_2a9c68f9942');
  shouldFail('bad hash', 'sdk_testfoo_2a9c68f993');
  shouldFail('bad case', 'sdk_Testfoo_2a9c68f994');
  shouldFail('bad prefix', 'xsdk_testfoo_2a9c68f994');
});
