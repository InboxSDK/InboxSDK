/* @flow */

import {createHash} from 'crypto';

const cache: Map<string,string> = new Map();
let seed: ?string = null;

export default function idMap(name: string): string {
  const id = cache.get(name);
  if (id != null) return id;

  if (!seed) {
    seed = document.documentElement.getAttribute('data-map-id');
    if (!seed) {
      seed = String(Math.random());
      document.documentElement.setAttribute('data-map-id', seed);
    }
  }

  let newId;
  if (process.env.NODE_ENV === 'development') {
    newId = name;
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
