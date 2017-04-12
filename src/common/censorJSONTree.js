/* @flow */

export default function censorJSONTree(object: Object): string {
  return JSON.stringify(object, (key, value) => (
    typeof value === 'string' ? '...' : value
  ));
}
