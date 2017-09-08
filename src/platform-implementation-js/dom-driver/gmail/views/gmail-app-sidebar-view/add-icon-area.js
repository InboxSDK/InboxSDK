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

  // if the loading holder is not visible then the tablist has loaded
  // or we are loading a thread view for the very first time where Gmail
  // doesn't show the loading spinner, and instead shows nothing until
  // it just pops in the sidebar
  if(loadingHolder.style.display === 'none'){
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
  }
  else{
    // loading holder is visible, so we first add the icon area to the loading holder
    // then when loading is done we add the iconArea to the tablist
    loadingHolder.insertAdjacentElement('afterbegin', iconArea);
    makeMutationObserverChunkedStream(loadingHolder, {attributes: true, attributeFilter: ['style']})
      .filter(() => loadingHolder.style.display === 'none')
      .take(1)
      .takeUntilBy(stopper)
      .onValue(() => {
        querySelector(addonSidebarContainerEl, '[role=tablist]').insertAdjacentElement('afterbegin', iconArea);
      });
  }
}

export default defn(module, addIconArea);
