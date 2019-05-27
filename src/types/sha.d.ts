declare module 'sha.js' {
  import { Hash } from 'crypto';

  function SHA(algorithm: string): Hash;

  namespace SHA {
    type Algorithm = 'sha' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
    interface HashStatic {
      new (): Hash;
    }

    const sha: HashStatic;
    const sha1: HashStatic;
    const sha224: HashStatic;
    const sha256: HashStatic;
    const sha384: HashStatic;
    const sha512: HashStatic;
  }
  export = SHA;
}

declare module 'sha.js/sha256' {
  import { Hash } from 'crypto';
  const SHA: {
    new (): Hash;
  };
  export = SHA;
}
