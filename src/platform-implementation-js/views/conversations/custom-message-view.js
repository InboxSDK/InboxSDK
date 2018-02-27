/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import SafeEventEmitter from '../../lib/safe-event-emitter';

export type CustomMessageDescriptor = {
  collapsedEl: HTMLElement;
  headerEl: HTMLElement;
  bodyEl: HTMLElement;
  iconUrl: string;
  sortDate: Date;
};

export default class CustomMessageView extends SafeEventEmitter {
  _el: HTMLElement;
  _iconEl: HTMLElement;
  _contentEl: HTMLElement;
  _contentHeaderEl: HTMLElement;
  _contentBodyEl: HTMLElement;
  _destroyed: boolean = false;
  _stopper = kefirStopper();
  _isCollapsed: boolean = true;
  _lastDescriptor: ?CustomMessageDescriptor;

  constructor(descriptorStream: Kefir.Observable<CustomMessageDescriptor>) {
    super();

    this._setupElement();

    descriptorStream.onValue(descriptor => {
      this._el.setAttribute('data-inboxsdk-sortdate', String(descriptor.sortDate.getTime()));

      const previousDescriptor = this._lastDescriptor;
      this._lastDescriptor = descriptor;

      if(!previousDescriptor || previousDescriptor.iconUrl !== descriptor.iconUrl){
        const img = document.createElement('img');
        img.src = descriptor.iconUrl;
        this._iconEl.innerHTML = '';
        this._iconEl.appendChild(img);
      }

      if((!previousDescriptor || previousDescriptor.collapsedEl !== descriptor.collapsedEl) && this._isCollapsed) {
        if (previousDescriptor) previousDescriptor.collapsedEl.remove();
        this._contentEl.appendChild(descriptor.collapsedEl);
      }

      if(!previousDescriptor || previousDescriptor.headerEl !== descriptor.headerEl){
        if(previousDescriptor) previousDescriptor.headerEl.remove();
        this._contentHeaderEl.appendChild(descriptor.headerEl);
      }

      if(!previousDescriptor || previousDescriptor.bodyEl !== descriptor.bodyEl) {
        if(previousDescriptor) previousDescriptor.bodyEl.remove();
        this._contentBodyEl.appendChild(descriptor.bodyEl);
      }

    });
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._stopper.destroy();
    this.emit('destroy');
    this._el.remove();
  }

  expand() {
    this._isCollapsed = false;
    const descriptor = this._lastDescriptor;

    if(descriptor) descriptor.collapsedEl.remove();

    this._contentEl.appendChild(this._contentHeaderEl);
    this._contentEl.appendChild(this._contentBodyEl);

    this._el.classList.remove('inboxsdk__custom_message_view_collapsed');
    this.emit('expanded');
  }

  collapse() {
    this._isCollapsed = true;
    this._contentHeaderEl.remove();
    this._contentBodyEl.remove();

    const descriptor = this._lastDescriptor;

    if(descriptor){
      this._contentEl.appendChild(descriptor.collapsedEl);
    }

    this._el.classList.add('inboxsdk__custom_message_view_collapsed');
    this.emit('collapsed');
  }

  getElement() {
    return this._el;
  }

  getSortDate() {
    if(this._lastDescriptor) return this._lastDescriptor.sortDate;
    else return null;
  }

  _setupElement(){
    this._el = document.createElement('div');
    this._el.classList.add('inboxsdk__custom_message_view');
    this._el.classList.add('inboxsdk__custom_message_view_collapsed');

    this._iconEl = document.createElement('div');
    this._iconEl.classList.add('inboxsdk__custom_message_view_icon');

    this._contentEl = document.createElement('div');
    this._contentEl.classList.add('inboxsdk__custom_message_view_content');

    this._contentHeaderEl = document.createElement('div');
    this._contentHeaderEl.classList.add('inboxsdk__custom_message_view_header');

    this._contentBodyEl = document.createElement('div');
    this._contentBodyEl.classList.add('inboxsdk__custom_message_view_body');

    this._el.appendChild(this._iconEl);
    this._el.appendChild(this._contentEl);

    this._el.addEventListener('click', () => {
      if(this._isCollapsed) this.expand();
    });

    this._contentHeaderEl.addEventListener('click', (e: MouseEvent) => {
      this.collapse();
      e.stopPropagation();
    });
  }
}
