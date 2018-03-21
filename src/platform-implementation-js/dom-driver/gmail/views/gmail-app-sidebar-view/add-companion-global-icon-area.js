/* @flow */

import {defn} from 'ud';

import querySelector from '../../../../lib/dom/querySelectorOrFail';

/*
As of Feb 6th, 2018.
  div.brC-aT5-aOt-Jw - the container for native global icons and sidebar icons
    div.brC-aT5-aOt-bsf-Jw - container for global icons
    div.brC-aT5-aOt-ato-Kp-Jw - container for sidebar icons
      div.bvq - matches the structure in regular add-on icon sidebar
*/

const GLOBAL_ICON_AREA_SELECTOR = '.brC-aT5-aOt-bsf-Jw';

function addCompanionGlobalIconArea(iconArea: HTMLElement, companionSidebarIconContainerEl: HTMLElement){
  const sidebarIconArea = companionSidebarIconContainerEl.querySelector(GLOBAL_ICON_AREA_SELECTOR);
  if(!sidebarIconArea) return;
  const nativeIconArea = sidebarIconArea.firstElementChild;
  if(!nativeIconArea) return;

  nativeIconArea.insertAdjacentElement('beforebegin', iconArea);
}


export default defn(module, addCompanionGlobalIconArea);
