// Splits a string on spaces, but ignores spaces inside quotes.

function quotedSplit(s) {
  var split = [];
  var lastEnd = 0;
  var quoteRe = /"[^"]*"/g;
  while (true) {
    var match = quoteRe.exec(s);
    split = split.concat(
      (
        match ? s.substring(lastEnd, match.index) : s.substring(lastEnd)
      ).split(/ +/).filter(Boolean));
    if (!match)
      break;
    lastEnd = match.index + match[0].length;
    split.push(match[0]);
  }
  return split;
}

module.exports = quotedSplit;
