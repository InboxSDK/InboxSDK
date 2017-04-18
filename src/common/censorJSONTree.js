/* @flow */

export default function censorJSONTree(object: Object): string {
  return JSON.stringify(object, (key, value) => {
    if (typeof value !== 'string' || value.length <= 10) return value;

    return `${value.substring(0, 10)}...`;
  });
}
