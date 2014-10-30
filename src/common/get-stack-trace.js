function getStackTrace() {
  var err = new Error("Stack saver");
  if (typeof err.stack !== "string")
    return err.stack;
  // Cut the first two lines off. The first line has the error name, and the
  // second line is inside this function.
  return err.stack.replace(/^([^\n]*\n){2}/, '');
}

module.exports = getStackTrace;
