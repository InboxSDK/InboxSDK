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
const LOADING_AREA_SELECTOR = '.brC-aT5-aOt-awd-avS,div[role=presentation][aria-disabled=true]';

function addCompanionThreadIconArea(iconArea: HTMLElement, companionSidebarIconContainerEl: HTMLElement){
  const loadingHolder = companionSidebarIconContainerEl.querySelector(LOADING_AREA_SELECTOR);
  if(!loadingHolder) {
    console.warn('no loadingHolder');
    return;
  }

  const tabList = companionSidebarIconContainerEl.querySelector(TAB_LIST_SELECTOR);
  if(!tabList) {
    console.warn('no tablist');
    return;
  }

  // emits when the loading div display style changes
  const loadingDivIsDisplayedStream =
    makeMutationObserverChunkedStream(loadingHolder, {attributes: true, attributeFilter: ['style']})
      .toProperty(() => null)
      .map(() => loadingHolder.style.display !== 'none');

  // emits when the tablist div gets role=tablist
  const tabListRoleStream =
    makeMutationObserverChunkedStream(tabList, {attributes: true, attributeFilter: ['role']})
      .toProperty(() => null)
      .filter(() => tabList.getAttribute('role') === 'tablist');

  // first we add sdk icon container as previous sibling to native tablist
  tabList.insertAdjacentElement('beforebegin', iconArea);

  // now we wait for loading to be hidden and tablist to be formed, and then we
  // add sdk icon container to tablist
  Kefir.combine([
    loadingDivIsDisplayedStream.filter((value) => !value),
    tabListRoleStream
  ])
  .onValue(() => {
    tabList.insertAdjacentElement('afterbegin', iconArea);
    maintainIconArea(iconArea, tabList, loadingDivIsDisplayedStream.filter(Boolean));
  });

  // if the addon loading div becomes visible then we create a clone of it and put the clone in a
  // better place that works with our icons better. the native addon loading div is hidden with css
  // but the style attribute still gets modified by gmail so we know when the loading should go away
  loadingDivIsDisplayedStream
    .filter(Boolean)
    .onValue(() => {
      const loadingClone = document.createElement('div');
      loadingClone.innerHTML = loadingHolder.innerHTML;
      loadingClone.classList.add('inboxsdk__addon_icon_loading');
      tabList.insertAdjacentElement('beforebegin', iconArea);
      iconArea.insertAdjacentElement('afterend', loadingClone);

      loadingDivIsDisplayedStream
        .filter((value) => !value)
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

export default defn(module, addCompanionThreadIconArea);
