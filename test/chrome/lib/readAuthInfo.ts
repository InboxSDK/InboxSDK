import fs from 'fs';
import once from 'lodash/once';
import simpleEncryptor from 'simple-encryptor';

// You can use ./tools/read-test-secret.js to decrypt this locally and
// ./tools/write-test-secret.js to create a new value.

const ciphertext =
  '627e61f10747cedf6aaaeca80cae872971d377663f2ca7bb9d510e92bb4a3645061f87959841600844f12c26128fa0d4Mama0AGpxGDGL88ZsTScyTSAHWV0/fkSqKCKMxXUQr7kJmMChJFH0ykNBZQBZKfESGDzCCwPbQp4hw6nP69nZNNgycEih+N/Q7r18TJOxiOGU9cF5QBlrxe13L7CJD1StJNbyxoVTRhtp+KS9hikyA==';

interface AuthInfo {
  [email: string]: {
    password: string;
    twofactor: string;
  };
}

const readAuthInfo = once(
  async (): Promise<AuthInfo> => {
    const encryptor = simpleEncryptor(
      process.env.INBOXSDK_TEST_SECRET ||
        fs
          .readFileSync(__dirname + '/../../../.inboxsdk_test_secret', 'utf8')
          .trim()
    );
    return encryptor.decrypt(ciphertext)!;
  }
);

export default readAuthInfo;
