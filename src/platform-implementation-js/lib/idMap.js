/* @flow */

import random from 'lodash/random';

const m: Map<string,string> = new Map();
const takenNumbers: Set<number> = new Set();

export function getId(name: string): string {
  const id = m.get(name);
  if (id != null) return id;
  throw new Error(`Name not found in idMap: ${name}`);
}

export function createId(name: string): string {
  const id = m.get(name);
  if (id != null) return id;

  let newId;
  if (process.env.NODE_ENV === 'development') {
    newId = `IDMAP_${name}`;
  } else {
    let n = random(0x100000, 0xffffff);
    while (takenNumbers.has(n)) n++;
    takenNumbers.add(n);
    newId = n.toString(16)
      .replace(/[0-9]/g, match => String.fromCharCode('A'.charCodeAt(0) + Number(match)));
  }
  m.set(name, newId);
  return newId;
}

// Only exposed for tests!
export function _reset() {
  m.clear();
  takenNumbers.clear();
}
