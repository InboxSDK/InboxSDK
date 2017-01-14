/* @flow */

import Sha256 from 'sha.js/sha256';

const cache: Map<string,string> = new Map();
let seed: ?string = null;
let useDevMode: boolean = false;

// Pass a name and you'll get a unique identifier associated with that name.
// The returned identifier will only contain alphabetic characters.
export default function idMap(name: string): string {
  const id = cache.get(name);
  if (id != null) return id;

  if (seed == null) {
    seed = document.documentElement.getAttribute('data-map-id');
    if (seed == null) {
      // Make the seed change every hour: the seed is based on a hash of the
      // current timestamp in hour resolution.
      const hasher = new Sha256();
      hasher.update('PWVe'+Math.floor(Date.now()/(1000*60*60))+'PYiE0');
      seed = hasher.digest('hex').slice(0,16) + ((process.env.NODE_ENV === 'development') ? 'x' : '');
      document.documentElement.setAttribute('data-map-id', seed);
    }
    useDevMode = /x$/.test(seed);
  }

  let newId;
  if (useDevMode) {
    const n = String(seed.charCodeAt(0)%10);
    newId = `idm${n}_${name}`;
  } else {
    const hasher = new Sha256();
    hasher.update('4iYi29W'+name+':'+seed+'jn2mPvTG');
    newId = hasher.digest('hex').slice(0,16).replace(
      /[0-9]/g,
      match => String.fromCharCode('A'.charCodeAt(0) + Number(match))
    );
  }
  cache.set(name, newId);
  return newId;
}

// Only exposed for tests!
export function _reset() {
  cache.clear();
  seed = null;
}
