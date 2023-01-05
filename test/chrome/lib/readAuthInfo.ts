import fs from 'fs';
import once from 'lodash/once';
import { createEncryptor } from 'simple-encryptor';

// You can use ./tools/read-test-secret.js to decrypt this locally and
// ./tools/write-test-secret.js to create a new value.

const ciphertext =
  'eaaf4ff7035437f90aa891ba9bd23861d654e5fa04436f20d456d03f38c85dfaa63af466ffb868b8fec05b53c9de9b11wfzdY/duk/vlmZ/C1kL1Sg3Pzr7EdduYniHO2kUCGJxuC1yDkA/OI/2uiOjXdkVagPGuZ1ZkBi6tqzl7mTRbQoBwFOfbS313rWwNUMd3GVLuebNT+mnC74/NLNXvXMSoJu6criRqxYPya5vy7LDixJ7ZrqST2ZIYFYYAYfMHbdE=';

interface AuthInfo {
  [email: string]: {
    password: string;
    twofactor: string;
  };
}

const readAuthInfo = once(async (): Promise<AuthInfo> => {
  const encryptor = createEncryptor(
    process.env.INBOXSDK_TEST_SECRET ||
      fs
        .readFileSync(__dirname + '/../../../.inboxsdk_test_secret', 'utf8')
        .trim()
  );
  return encryptor.decrypt(ciphertext)!;
});

export default readAuthInfo;
