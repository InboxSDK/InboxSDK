/* @flow */

import {defn} from 'ud';

import Kefir from 'kefir';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';


const TAB_LIST_SELECTOR = '.J-KU-Jg';

function addIconArea(iconArea: HTMLElement, addonSidebarContainerEl: HTMLElement, stopper: Kefir.Observable<*>){
  const tabList = addonSidebarContainerEl.querySelector('[role=tablist]');
  const loadingHolderAsAny: any = addonSidebarContainerEl.firstElementChild;
  const loadingHolder = (loadingHolderAsAny: ?HTMLElement);
  if(!loadingHolder) return;

  if(tabList){
    tabList.insertAdjacentElement('afterbegin', iconArea);
  }
  else{
    // the very first time that a thread is loaded the add-ons icon area is not visible
    // and the "tabList" which holds the add-ons icons is missing the role=tablist attribute
    // so we wait for the tablist to get that role attribute and then render our iconArea in there
    // and while we're waiting we render into the still loading tablist so that the iconArea
    // is discoverable, so that we don't get multiple iconAreas from different extensions
    const stillFormingTablist = querySelector(addonSidebarContainerEl, TAB_LIST_SELECTOR);
    stillFormingTablist.insertAdjacentElement('afterbegin', iconArea);

    // Gmail periodically clears the children of this element before it's
    // visible, so we fight back.
    makeMutationObserverChunkedStream(stillFormingTablist, {childList: true})
      .filter(() => iconArea.parentElement !== stillFormingTablist)
      .takeUntilBy(stopper)
      .onValue(() => {
        stillFormingTablist.insertAdjacentElement('afterbegin', iconArea);
      });
  }

  // if the addon loading div is visible then we create a clone of it and put the clone in a
  // better place that works with our icons better. the native addon loading div is hidden with css
  // but the style attribute still gets modified by gmail so we know when the loading should go away
  if(loadingHolder.style.display !== 'none') {
    const loadingClone = document.createElement('div');
    loadingClone.innerHTML = loadingHolder.innerHTML;
    loadingClone.classList.add('inboxsdk__addon_icon_loading');
    iconArea.insertAdjacentElement('afterend', loadingClone);

    makeMutationObserverChunkedStream(loadingHolder, {attributes: true, attributeFilter: ['style']})
      .filter(() => loadingHolder.style.display === 'none')
      .take(1)
      .takeUntilBy(stopper)
      .onValue(() => {
        loadingClone.remove();
        querySelector(addonSidebarContainerEl, '[role=tablist]').insertAdjacentElement('afterbegin', iconArea);
      });
  }
}

export default defn(module, addIconArea);
