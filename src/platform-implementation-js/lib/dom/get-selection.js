/* @flow */
//jshint ignore:start

var _ = require('lodash');

function isRangeEmpty(range: Range): boolean {
  return range.startContainer === range.endContainer &&
    range.startOffset === range.endOffset;
}

// returns true if either end appears to be inside the element
function isRangeInElement(range: Range, el: HTMLElement): boolean {
  return el.contains(range.startContainer) || el.contains(range.endContainer);
}

function isRangeSuitable(range: ?Range, el: HTMLElement): boolean {
  return !!range && !isRangeEmpty(range) && isRangeInElement(range, el);
}

export function getSelectedTextInElement(element: HTMLElement, lastRange?: ?Range): ?string {
  var selection = (document:any).getSelection();
  return _.chain([
      selection && selection.rangeCount ? selection.getRangeAt(0) : null,
      lastRange
    ])
    .filter(range => isRangeSuitable(range, element))
    .map(range => range.toString())
    .head()
    .value();
}

export function getSelectedHTMLInElement(element: HTMLElement, lastRange?: ?Range): ?string {
  var selection = (document:any).getSelection();
  return _.chain([
      selection && selection.rangeCount ? selection.getRangeAt(0) : null,
      lastRange
    ])
    .filter(range => isRangeSuitable(range, element))
    .map(range => {
      var div = document.createElement('div');
      div.appendChild(range.cloneContents());
      return div.innerHTML;
    })
    .head()
    .value();
}
