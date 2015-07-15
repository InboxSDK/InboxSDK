/* @flow */
//jshint ignore:start

export default function cssSelectorEscape(text: string): string {
  if (text.length === 0 || /^-?[0-9]/.test(text)) {
    throw new Error("Invalid CSS selector");
  }
  return text.replace(/[^a-z0-9]/g, '\\$&');
}
