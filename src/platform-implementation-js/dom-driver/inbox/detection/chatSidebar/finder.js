/* @flow */

export default function finder(root: Document=document): Array<HTMLElement> {
  return [root.querySelector('#in')]
    .filter(Boolean)
    .map(el => (el:any).parentElement);
}
