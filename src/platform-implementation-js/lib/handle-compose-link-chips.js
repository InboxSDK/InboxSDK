/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';
import {defn} from 'ud';
import querySelector from './dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';

const extId = ''+Math.random();

const Z_SPACE_CHAR = '\u200b';
const X_URL = 'https://ssl.gstatic.com/ui/v1/icons/common/x_8px.png';

const handleComposeLinkChips = defn(module, function(composeView: ComposeViewDriver) {
  // Abort if we're missing elements we'll need.
  try {
    composeView.getBodyElement();
  } catch(err) {
    return;
  }

  const mainElement = composeView.getElement();
  _waitToClaim(mainElement)
    .takeUntilBy(composeView.getStopper())
    .onValue(() => {
      mainElement.classList.add('inboxsdk__ensure_link_active');
      composeView.getStopper().onValue(() => {
        mainElement.classList.remove('inboxsdk__ensure_link_active');
      });

      composeView.getEventStream()
        .filter(event => event.eventName === 'bodyChanged')
        .toProperty(()=>null)
        .debounce(100, {immediate:true})
        .takeUntilBy(composeView.getStopper())
        .onValue(() => {
          doFixing(composeView);
        });

      composeView.getEventStream()
        .filter(event => event.eventName === 'presending')
        .onValue(() => {
          doPresendFixing(composeView);
        });

    });
});
export default handleComposeLinkChips;

const doFixing = defn(module, function(composeView: ComposeViewDriver) {
  const bodyElement = composeView.getBodyElement();
  const chips = _getChipElements(bodyElement);

  chips
    .filter(_isNotEnhanced)
    .forEach(_addEnhancements);
}, 'doFixing');

const doPresendFixing = defn(module, function(composeView: ComposeViewDriver) {
  const bodyElement = composeView.getBodyElement();
  const chips = _getChipElements(bodyElement);
  chips
    .filter(_isOurEnhanced)
    .forEach(chip => {
      const xBtn = chip.querySelector(`img[src="${X_URL}"]`);
      if (xBtn) {
        xBtn.remove();
      }
      const title = chip.querySelector('a > span');
      if (title) {
        title.style.textDecoration = 'none';
      }
    });
}, 'doPresendFixing');

function _getChipElements(bodyElement: HTMLElement): HTMLElement[] {
  const chipInnerEls = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
  return [
    ...Array.from(chipInnerEls).map(x => (x.parentElement: any)),
    ...Array.from(bodyElement.querySelectorAll('[hspace=inboxsdk__chip_main]'))
  ];
}

function _waitToClaim(el: HTMLElement): Kefir.Observable<boolean> {
  return Kefir.later(0).merge(
      makeMutationObserverChunkedStream(el, {attributes: true, attributeFilter: ['class']})
    )
    .map(() => !el.classList.contains('inboxsdk__ensure_link_active'))
    .filter(Boolean)
    .take(1);
}

function _isNotEnhanced(chipElement: HTMLElement): boolean {
    var claim = chipElement.getAttribute('data-sdk-linkchip-claimed');
    if (extId === claim) {
      return !(chipElement:any)._linkChipEnhancedByThisExtension;
    }
    return claim == null;
}

// Returns whether the chip is enhanced specifically by this extension
function _isOurEnhanced(chipElement: HTMLElement): boolean {
    return !!(chipElement:any)._linkChipEnhancedByThisExtension;
}

function _addEnhancements(chipElement: HTMLElement) {
    const anchor = chipElement.querySelector('a');
    if (anchor) {
      anchor.addEventListener('mousedown', function(e: MouseEvent) {
        e.stopImmediatePropagation();
      }, true);
      anchor.addEventListener('click', function(e: MouseEvent) {
        e.stopImmediatePropagation();
      }, true);
    }

    const xElement = document.createElement('img');
    xElement.src = X_URL;
    xElement.setAttribute('style', 'opacity: 0.55; cursor: pointer; float: right; position: relative; top: -1px;');

    xElement.addEventListener('mousedown', function(e: MouseEvent){
        chipElement.remove();
    }, true);

    xElement.addEventListener('click', function(e: MouseEvent){
        e.stopImmediatePropagation();
        e.preventDefault();
    }, true);


    chipElement.addEventListener(
        'mouseenter',
        function(){
            chipElement.appendChild(xElement);
            querySelector(chipElement, 'a > span').style.textDecoration = 'underline';
        }
    );

    chipElement.addEventListener(
        'mouseleave',
        function(){
            (xElement:any).remove();
            querySelector(chipElement, 'a > span').style.textDecoration = 'none';
        }
    );

    chipElement.addEventListener(
        'mousedown',
        function(e: MouseEvent){
            e.preventDefault();
        }
    );

    chipElement.contentEditable = 'false';
    chipElement.setAttribute('data-sdk-linkchip-claimed', extId);
    (chipElement:any)._linkChipEnhancedByThisExtension = true;
}
