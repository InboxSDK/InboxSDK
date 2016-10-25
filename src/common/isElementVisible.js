/* @flow */

// This function answers the question "Does this element consume space in the
// document?" Based on jQuery's :visible selector:
// https://api.jquery.com/visible-selector/

export default function isElementVisible(el: HTMLElement): boolean {
  return el.offsetWidth > 0 || el.offsetHeight > 0;
}
