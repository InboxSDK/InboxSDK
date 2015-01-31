function escapeShellArg(arg) {
  return "$'" + arg.replace(/\\/g, '\\\\').replace(/'/g, "\\\'") + "'";
}

module.exports = escapeShellArg;
