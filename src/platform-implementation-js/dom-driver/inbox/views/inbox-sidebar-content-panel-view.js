/* @flow */

import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';

class InboxSidebarContentPanelView {
  _stopper: Kefir.Observable<null>;
  _eventStream = kefirBus();
  _el: HTMLElement;
  _titleEl: HTMLElement;
  _contentEl: HTMLElement;

  constructor(descriptor: Kefir.Observable<Object>) {
    this._stopper = this._eventStream.ignoreValues().beforeEnd(() => null).toProperty();
    this._el = document.createElement('div');
    this._el.className = 'inboxsdk__app_sidebar_content_panel';
    this._el.innerHTML = `
      <div class="inboxsdk__app_sidebar_content_panel_title"></div>
      <div class="inboxsdk__app_sidebar_content_panel_content"></div>
    `;
    this._titleEl = this._el.querySelector('.inboxsdk__app_sidebar_content_panel_title');
    this._contentEl = this._el.querySelector('.inboxsdk__app_sidebar_content_panel_content');

    descriptor
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        const imgHtml = descriptor.iconUrl ? autoHtml `<img src="${descriptor.iconUrl}">` : '';
        this._titleEl.innerHTML = autoHtml `
          <span class="inboxsdk__app_sidebar_content_panel_title_icon ${descriptor.iconClass||''}">
            ${{__html: imgHtml}}
          </span>
          <span class="inboxsdk__app_sidebar_content_panel_title_text">
            ${descriptor.title}
          </span>
        `;
        if (this._contentEl.firstChild !== descriptor.el) {
          this._contentEl.innerHTML = '';
          this._contentEl.appendChild(descriptor.el);
        }
      });
  }

  getElement() {
    return this._el;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  getEventStream(): Kefir.Observable<*> {
    return this._eventStream;
  }

  scrollIntoView() {
    this._contentEl.scrollIntoView();
  }

  remove() {
    this._eventStream.end();
    this._el.remove();
  }
}

export default defn(module, InboxSidebarContentPanelView);
