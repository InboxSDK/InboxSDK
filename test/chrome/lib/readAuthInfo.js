/* @flow */

import fs from 'fs';
import once from 'lodash/once';
import simpleEncryptor from 'simple-encryptor';

const ciphertext = '90241ef02ce54266d41d5c70530370abc9d8001a4eb25c6006c8d3ec4bab5c8e83d80838fe6bd9a745da787e824f55b35SC5K7wp8ZoV72+X4IdcYhITyaEeZ/YH+8IilClYUGHO/TjgLcbzlsqicYUXEk7QRm+SM9tmYzlNLNypu8wk9TE02SfDnIJ0YDWxN/eldg9IgUhHhuGHlMIJaERi5BA3cO+OGoM4V0da7cR6+czCBQ==';

const readAuthInfo = once(() => {
  const encryptor = simpleEncryptor(
    process.env.INBOXSDK_TEST_SECRET ||
    fs.readFileSync(__dirname+'/../../../.inboxsdk_test_secret', 'utf8').trim()
  );
  return encryptor.decrypt(ciphertext);
});

export default readAuthInfo;
