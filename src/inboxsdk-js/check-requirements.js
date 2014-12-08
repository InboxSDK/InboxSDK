function checkRequirements(opts) {
  if (
    !opts.TEMPORARY_INTERNAL_skipWeakMapRequirement &&
    typeof WeakMap == 'undefined'
  ) {
    throw new Error("Browser does not support WeakMap");
  }
}

module.exports = checkRequirements;
