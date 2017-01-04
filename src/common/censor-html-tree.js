/* @flow */

import _ from 'lodash';
import autoHtml from 'auto-html';
import censorHTMLstring, {ATTRIBUTE_WHITELIST} from './censor-html-string';

export default function censorHTMLtree(target: HTMLElement): string {
  const openers: string[] = [];
  const closers: string[] = [];
  let parent = target;
  let lastIndex = 0;
  while (parent) {
    const attrHtml: string = _.map(parent.attributes, ({name, value}) =>
      autoHtml ` ${name}="${ATTRIBUTE_WHITELIST.has(name) ? value : '...'}"`
    ).join('');
    const headerElCount = lastIndex;
    const footerElCount = parent.children.length-1-lastIndex;
    const headers = target !== parent && headerElCount ? `[${headerElCount}]` : '';
    const footers = target !== parent && footerElCount ? `[${footerElCount}]` : '';
    openers.push(autoHtml `<${parent.nodeName.toLowerCase()}${{__html:attrHtml}}>${headers}`);
    closers.push(autoHtml `${footers}</${parent.nodeName.toLowerCase()}>`);

    if (parent.parentElement) {
      lastIndex = _.indexOf(parent.parentElement.children, parent);
    }
    parent = parent.parentElement;
  }
  return openers.reverse().join('') + censorHTMLstring(target.innerHTML) + closers.join('');
}
