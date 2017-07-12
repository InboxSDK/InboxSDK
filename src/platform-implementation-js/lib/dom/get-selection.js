/* @flow */

import t from 'transducers.js';

function isRangeEmpty(range: Range): boolean {
  return range.startContainer === range.endContainer &&
    range.startOffset === range.endOffset;
}

// returns true if either end appears to be inside the element
function isRangeInElement(range: Range, el: HTMLElement): boolean {
  return el.contains(range.startContainer) || el.contains(range.endContainer);
}

function isRangeSuitable(range: Range, el: HTMLElement): boolean {
  return !isRangeEmpty(range) && isRangeInElement(range, el);
}

export function getSelectedTextInElement(element: HTMLElement, lastRange?: ?Range): ?string {
  const selection = (document:any).getSelection();
  return t.toArray([
      selection && selection.rangeCount ? selection.getRangeAt(0) : null,
      lastRange
    ], t.compose(
      t.keep(),
      t.filter((range: Range) => isRangeSuitable(range, element)),
      t.map((range: Range) => range.toString()),
      t.take(1)
    ))[0];
}

export function getSelectedHTMLInElement(element: HTMLElement, lastRange?: ?Range): ?string {
  const selection = (document:any).getSelection();
  return t.toArray([
      selection && selection.rangeCount ? selection.getRangeAt(0) : null,
      lastRange
    ], t.compose(
      t.keep(),
      t.filter((range: Range) => isRangeSuitable(range, element)),
      t.map((range: Range) => {
        const div = document.createElement('div');
        div.appendChild(range.cloneContents());
        return div.innerHTML;
      }),
      t.take(1)
    ))[0];
}
