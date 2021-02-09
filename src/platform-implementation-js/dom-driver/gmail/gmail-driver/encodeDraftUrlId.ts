import { convertBase } from '@macil/simple-base-converter';

const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const GMAIL_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZbcdfghjklmnpqrstvwxz';

export default function encodeDraftUrlId(
  syncThreadId: string,
  syncMessageId: string
): string {
  const raw = `${syncThreadId.replace(/^thread-/, '')}+${syncMessageId}`;
  const b64 = Buffer.from(raw)
    .toString('base64')
    .replace(/=/g, '');
  return convertBase(b64, B64_ALPHABET, GMAIL_ALPHABET);
}
