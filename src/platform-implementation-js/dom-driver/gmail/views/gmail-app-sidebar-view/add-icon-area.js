/* @flow */

import {defn} from 'ud';

import Kefir from 'kefir';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';


function addIconArea(iconArea: HTMLElement, addonSidebarContainerEl: HTMLElement, stopper: Kefir.Observable<*>){
  const tabList = addonSidebarContainerEl.querySelector('[role=tablist]');
  const loadingHolderAsAny: any = querySelector(addonSidebarContainerEl, '.bqI').parentElement;
  const loadingHolder = (loadingHolderAsAny: ?HTMLElement);
  if(!loadingHolder) return;

  if(loadingHolder.style.display === 'none'){
    if(tabList){
      tabList.insertAdjacentElement('afterbegin', iconArea);
    }
    else{
      const stillFormingTablist = querySelector(addonSidebarContainerEl, '.J-KU-Jg');

      makeMutationObserverChunkedStream(stillFormingTablist, {attributes: true, attributeFilter: ['role']})
        .map(() => addonSidebarContainerEl.querySelector('[role=tablist]'))
        .filter(Boolean)
        .take(1)
        .takeUntilBy(stopper)
        .onValue(() => {
          querySelector(addonSidebarContainerEl, '[role=tablist]').insertAdjacentElement('afterbegin', iconArea);
        });
    }
  }
  else{
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
