/* @flow */

import {defn} from 'ud';

import Kefir from 'kefir';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import type Logger from '../../../../lib/logger';

/*
As of Feb 6th, 2018.
  div.brC-aT5-aOt-Jw - the container for native global icons and sidebar icons
    div.brC-aT5-aOt-bsf-Jw - container for sdk global sidebar icons
      [role=tablist] - container for native and sdk thread sidebar icons
*/

const TAB_LIST_SELECTOR = '[role=tablist],.J-KU-Jg';

function addCompanionThreadIconArea(logger: Logger, iconArea: HTMLElement, companionSidebarIconContainerEl: HTMLElement){
  const tabList = companionSidebarIconContainerEl.querySelector(TAB_LIST_SELECTOR);
  if(!tabList) {
    logger.error(new Error('addCompanionThreadIconArea: no tablist'));
    return;
  }

  const separator = companionSidebarIconContainerEl.querySelector('[role=separator]');
  if (!separator) {
    logger.error(new Error('addCompanionThreadIconArea: failed to find separator'));
    tabList.insertAdjacentElement('beforebegin', iconArea);
  } else {
    if (!separator.parentElement) throw new Error();
    separator.parentElement.insertBefore(iconArea, separator.nextElementSibling);
  }
}

export default defn(module, addCompanionThreadIconArea);
