/* @flow */

import Kefir from 'kefir';
import fromEventTargetCapture from '../../lib/from-event-target-capture';

const SELECTION_MASTER_ATTR = 'data-inboxsdk-selection-master-claimed';

const isNativeResultSelected = (resultEl: HTMLElement) => {
  const {backgroundColor}: {backgroundColor: string} = getComputedStyle(resultEl);

  const colorValues = backgroundColor.match(/(\d+)(?=,)/g);

  return colorValues && colorValues.some(color => parseInt(color) < 240);
};


export default function setupCustomAutocompleteSelectionHandling({
  resultsEl,
  resultsElRemovalStream,
  searchInput
}: {
  resultsEl: HTMLElement,
  resultsElRemovalStream: Kefir.Observable<any>,
  searchInput: HTMLInputElement
}): void {
  if (resultsEl.hasAttribute(SELECTION_MASTER_ATTR)) {
    return;
  }

  resultsEl.setAttribute(SELECTION_MASTER_ATTR, 'true');

  // We need to be able to cancel up/down arrow events before Inbox gets them,
  // but we only want to listen for events that happen while the search box
  // is in focus (since that's when up/down arrows manipulate selection).
  // As a result, we need to grab the search box's parent element so we can
  // capture and cancel events prior to Inbox's listeners.
  const searchInputParent = searchInput.parentElement;
  if (!searchInputParent) { throw new Error(); }

  fromEventTargetCapture(searchInputParent, 'keydown')
    .takeUntilBy(resultsElRemovalStream)
    .onValue((event: KeyboardEvent) => {
      console.log('keydown: ', event.keyCode);
      // event.stopPropagation();
      // event.stopImmediatePropagation();
    })
    .onEnd(() => resultsEl.removeAttribute(SELECTION_MASTER_ATTR));

  Kefir.fromEvents(resultsEl, 'mouseover')
    .takeUntilBy(resultsElRemovalStream)
    .map(({target}: {target: HTMLElement}) => (
      target.closest('.inboxsdk__search_suggestion:not(.inboxsdk__selected)')
    )).filter(Boolean).onValue(el => el.classList.add('inboxsdk__selected'));

  Kefir.fromEvents(resultsEl, 'mouseout')
    .takeUntilBy(resultsElRemovalStream)
    .map(({target, relatedTarget}: {target: HTMLElement, relatedTarget: ?HTMLElement}) => (
      (!(
        relatedTarget &&
        relatedTarget.closest('.inboxsdk__search_suggestion.inboxsdk__selected')
      ) && target.closest('.inboxsdk__search_suggestion.inboxsdk__selected'))
      || null
    )).filter(Boolean).onValue(el => el.classList.remove('inboxsdk__selected'));
}
