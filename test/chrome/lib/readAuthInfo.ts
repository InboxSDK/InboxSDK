import fs from 'fs';
import once from 'lodash/once';
import simpleEncryptor from 'simple-encryptor';

// You can use ./tools/read-test-secret.js to decrypt this locally and
// ./tools/write-test-secret.js to create a new value.

const ciphertext =
  'c4aadddf6d682e87d7fb23c0a968b06cc889246204c800cab84a1e1eaaf321f79981df2be855d4927182f97bd47447e397FKGJc7Ijge9PLot1VTtkm9IswFZMzXhlyRvdNuVkozPh95EaQZ41gxVqX2Tbw4rxfhPrKMHBovQkSMlP77xlREmdsQq6h66fBOTd5D/Lwp2e6JxlNpiHE+VwrkPb3K9aH2KhQ9532CV1tSKNEEXLOiyVS8eVkDZn7kRHbqXh0=';

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
