/* @flow */

interface Get {
  <K,V>(map: Map<K,V>, key: K): V;
  <K: {},V>(map: WeakMap<K,V>, key: K): V;
}

const get: Get = function get<K,V>(map: Map<K,V>|WeakMap<any,V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error("Key not found in map");
  }
  return value;
}

export default get;
