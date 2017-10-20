/* @flow */

import idMap from '../../../../lib/idMap';

export default class WidthManager {

  _contentContainerEl: Element;
  _addonSidebarContainerEl: Element;

  constructor(contentContainerEl: HTMLElement, addonSidebarContainerEl: HTMLElement){
    this._contentContainerEl = contentContainerEl;
    this._addonSidebarContainerEl = addonSidebarContainerEl;
  }

  fixWidths(){
    // right now width manager really just cares about when
    // there are no icons sdk or native and adds/removes some styling
    // classes accordingly

    const tabList = this._addonSidebarContainerEl.querySelector('[role=tablist]');
    if(!tabList) return;

    if(this._addonSidebarContainerEl.classList.contains(idMap('app_sidebar_in_use'))){
      this._contentContainerEl.classList.remove('container_app_sidebar_no_icons');
      return;
    }

    const noIconsVisible = ![...tabList.children].some(child => child.style.display !== 'none');
    if(noIconsVisible) this._contentContainerEl.classList.add('container_app_sidebar_no_icons');
    else this._contentContainerEl.classList.remove('container_app_sidebar_no_icons');
  }
}
