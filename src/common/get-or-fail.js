/* @flow */

export default function get<K,V>(map: Map<K,V>|WeakMap<K,V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error("Key not found in map");
  }
  return value;
}
