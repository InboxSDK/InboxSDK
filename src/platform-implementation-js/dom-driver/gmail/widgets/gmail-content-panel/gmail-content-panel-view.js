/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import type GmailContentPanelContainerView from './gmail-content-panel-container-view';

export default class GmailContentPanelView {
  destroyed: boolean;
  _eventStream: Bus<any>;
  _element: HTMLElement;
  _gmailContentPanelContainerView: Object;

  constructor(contentPanelDescriptor: Kefir.Observable<Object>, gmailContentPanelContainerView: GmailContentPanelContainerView) {
    this.destroyed = false;
    this._eventStream = kefirBus();
    this._element = document.createElement('div');

    this._gmailContentPanelContainerView = gmailContentPanelContainerView;
    contentPanelDescriptor
      .takeUntilBy(this._eventStream.filter(()=>false).beforeEnd(()=>null))
      .map(x => x.el)
      .skipDuplicates()
      .onValue(el => {
        this._element.innerHTML = '';
        this._element.appendChild(el);
      });
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      this._eventStream.end();
      (this._element:any).remove();
      this._gmailContentPanelContainerView.remove(this);
    }
  }

  getEventStream(): Kefir.Observable<Object> {return this._eventStream;}
  getElement(): HTMLElement {return this._element;}

  activate() {
    this._eventStream.emit({
      eventName: 'activate'
    });
  }

  deactivate() {
    this._eventStream.emit({
      eventName: 'deactivate'
    });
    (this._element:any).remove();
  }

  remove() {
    this.destroy();
  }
}
