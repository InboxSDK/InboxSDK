/* @flow */
//jshint ignore:start

export default function escapeShellArg(arg: string): string {
  return "$'" + arg.replace(/\\/g, '\\\\').replace(/'/g, "\\\'") + "'";
}
