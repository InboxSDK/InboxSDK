/* @flow */

import {createHash} from 'crypto';

const cache: Map<string,string> = new Map();
let seed: ?string = null;
let useDevMode: boolean = false;

export default function idMap(name: string): string {
  const id = cache.get(name);
  if (id != null) return id;

  if (seed == null) {
    seed = document.documentElement.getAttribute('data-map-id');
    if (seed == null) {
      seed = String(Math.random()) + ((process.env.NODE_ENV === 'development') ? 'd' : '');
      document.documentElement.setAttribute('data-map-id', seed);
    }
    useDevMode = /d$/.test(seed);
  }

  let newId;
  if (useDevMode) {
    const n = String(Math.floor(parseFloat(seed)*10)).charAt(0);
    newId = `idm${n}_${name}`;
  } else {
    const hasher = createHash('sha1');
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
