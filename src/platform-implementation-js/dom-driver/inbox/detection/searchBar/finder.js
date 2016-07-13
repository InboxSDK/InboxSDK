/* @flow */

export default function finder(root: Document=document): Array<HTMLElement> {
  return Array.from(root.querySelectorAll('nav[role=banner] div[jsaction*="scroll_to_top"] > :last-child > div:not(:empty)'));
}
