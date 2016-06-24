/* @flow */

import notp from 'notp';
import base32 from 'thirty-two';

export default function googleTotp(key: string): string {
  return notp.totp.gen(
    base32.decode(key.replace(/\s+/g, ''))
  );
}
