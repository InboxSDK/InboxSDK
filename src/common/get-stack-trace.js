/* @flow */

export default function getStackTrace(): string {
  var err = new Error("Stack saver");
  // Cut the first two lines off. The first line has the error name, and the
  // second line is inside this function.
  return (""+err.stack).replace(/^([^\n]*\n){2}/, '');
}
