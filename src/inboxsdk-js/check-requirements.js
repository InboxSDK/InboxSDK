function checkRequirements(opts) {
  if (!opts.TEMPORARY_INTERNAL_skipWeakMapRequirement && !global.WeakMap) {
    throw new Error("Browser does not support WeakMap");
  }
}

module.exports = checkRequirements;
