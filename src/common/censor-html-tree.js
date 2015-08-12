/* @flow */
//jshint ignore:start

var _ = require('lodash');
var autoHtml = require('auto-html');
import censorHTMLstring, {ATTRIBUTE_WHITELIST} from './censor-html-string';

export default function censorHTMLtree(target: HTMLElement): string {
  var openers: string[] = [];
  var closers: string[] = [];
  var parent = target;
  var lastIndex = 0;
  while (parent) {
    var attrHtml: string = _.map(parent.attributes, ({name, value}) =>
      autoHtml ` ${name}="${ATTRIBUTE_WHITELIST.has(name) ? value : '...'}"`
    ).join('');
    var headerElCount = lastIndex;
    var footerElCount = parent.children.length-1-lastIndex;
    var headers = target !== parent && headerElCount ? `[${headerElCount}]` : '';
    var footers = target !== parent && footerElCount ? `[${footerElCount}]` : '';
    openers.push(autoHtml `<${parent.nodeName.toLowerCase()}${{__html:attrHtml}}>${headers}`);
    closers.push(autoHtml `${footers}</${parent.nodeName.toLowerCase()}>`);

    if (parent.parentElement) {
      lastIndex = _.indexOf(parent.parentElement.children, parent);
    }
    parent = parent.parentElement;
  }
  return openers.reverse().join('') + censorHTMLstring(target.innerHTML) + closers.join('');
}
