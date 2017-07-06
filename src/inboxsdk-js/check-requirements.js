/* @flow */

export default function checkRequirements(opts: Object) {
  if (!opts.TEMPORARY_INTERNAL_skipWeakMapRequirement && !global.WeakMap) {
    throw new Error("Browser does not support WeakMap");
  }
}
