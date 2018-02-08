/* @flow */

import {defn} from 'ud';

import Kefir from 'kefir';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';


/*
As of Feb 6th, 2018.
  div.brC-aT5-aOt-Jw - the container for native global icons and sidebar icons
    div.brC-aT5-aOt-bsf-Jw - container for global icons
    div.brC-aT5-aOt-ato-Kp-Jw - container for sidebar icons
      div.bvq - matches the structure in regular add-on icon sidebar
*/

const TAB_LIST_SELECTOR = '[role=tablist],.J-KU-Jg';

function addCompanionIconArea(iconArea: HTMLElement, companionSidebarIconContainerEl: HTMLElement, stopper: Kefir.Observable<*>){
  const sidebarIconArea = companionSidebarIconContainerEl.querySelector('.brC-aT5-aOt-ato-Kp-Jw');
  if(!sidebarIconArea) return;
  const nativeIconArea = sidebarIconArea.firstElementChild;
  if(!nativeIconArea) return;
  const loadingHolderAsAny: any = nativeIconArea.firstElementChild;
  const loadingHolder = (loadingHolderAsAny: ?HTMLElement);
  if(!loadingHolder) return;

  const tabList = sidebarIconArea.querySelector(TAB_LIST_SELECTOR);
  if(!tabList) return;

  // emits when the loading div style becomes display none
  const loadingDivDisplayValueStream =
    makeMutationObserverChunkedStream(loadingHolder, {attributes: true, attributeFilter: ['style']})
      .toProperty(() => null)
      .map(() => loadingHolder.style.display === 'none');

  // emits when the tablist div gets role=tablist
  const tabListRoleStream =
    makeMutationObserverChunkedStream(tabList, {attributes: true, attributeFilter: ['role']})
      .toProperty(() => null)
      .filter(() => tabList.getAttribute('role') === 'tablist');

  // first we add sdk icon container as previous sibling to native tablist
  tabList.insertAdjacentElement('beforebegin', iconArea);

  // now we wait for loading to be gone and tablist to be formed, and then we
  // add sdk icon container to tablist
  Kefir.combine([
    loadingDivDisplayValueStream.filter(Boolean),
    tabListRoleStream
  ])
  .takeUntilBy(stopper)
  .take(1)
  .onValue(() => {
    tabList.insertAdjacentElement('afterbegin', iconArea);
    maintainIconArea(iconArea, tabList, stopper);
  });

  // if the addon loading div becomes visible then we create a clone of it and put the clone in a
  // better place that works with our icons better. the native addon loading div is hidden with css
  // but the style attribute still gets modified by gmail so we know when the loading should go away
  loadingDivDisplayValueStream
    .filter(isDisplayNone => !isDisplayNone)
    .take(1)
    .takeUntilBy(stopper)
    .onValue(() => {
      const loadingClone = document.createElement('div');
      loadingClone.innerHTML = loadingHolder.innerHTML;
      loadingClone.classList.add('inboxsdk__addon_icon_loading');
      iconArea.insertAdjacentElement('afterend', loadingClone);

      Kefir.merge([
        loadingDivDisplayValueStream.filter(Boolean),
        stopper
      ])
      .take(1)
      .onValue(() => {
        loadingClone.remove();
      });
    });
}

// Gmail periodically clears the children of this element before it's
// visible, so we fight back.
function maintainIconArea(iconArea, tabList, stopper){
  makeMutationObserverChunkedStream(tabList, {childList: true})
    .filter(() => iconArea.parentElement !== tabList)
    .takeUntilBy(stopper)
    .onValue(() => {
      tabList.insertAdjacentElement('afterbegin', iconArea);
    });
}

export default defn(module, addCompanionIconArea);