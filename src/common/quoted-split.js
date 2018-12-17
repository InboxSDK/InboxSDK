/* @flow */

// Splits a string on spaces, but ignores spaces inside quotes.

export default function quotedSplit(s: string): string[] {
  let split: string[] = [];
  let lastEnd = 0;
  const quoteRe = /"[^"]*"/g;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const match = quoteRe.exec(s);
    split = split.concat(
      (match ? s.substring(lastEnd, match.index) : s.substring(lastEnd))
        .split(/ +/)
        .filter(Boolean)
    );
    if (!match) break;
    lastEnd = match.index + match[0].length;
    split.push(match[0]);
  }
  return split;
}
