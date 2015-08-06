/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Bacon = require('baconjs');
import type GmailContentPanelContainerView from './gmail-content-panel-container-view';

export default class GmailContentPanelView {
  destroyed: boolean;
  _eventStream: Bacon.Bus;
  _element: HTMLElement;
  _gmailContentPanelContainerView: Object;

  constructor(contentPanelDescriptor: Object, gmailContentPanelContainerView: GmailContentPanelContainerView) {
    this.destroyed = false;
    this._eventStream = new Bacon.Bus();
    this._element = document.createElement('div');

    this._gmailContentPanelContainerView = gmailContentPanelContainerView;
    contentPanelDescriptor
      .takeUntil(this._eventStream.filter(()=>false).mapEnd(()=>null))
      .map(x => x.el)
      .onValue(el => {this._element.appendChild(el);});
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      this._eventStream.end();
      (this._element:any).remove();
      this._gmailContentPanelContainerView.remove(this);
    }
  }

  getEventStream(): Bacon.Observable {return this._eventStream;}
  getElement(): HTMLElement {return this._element;}

  activate() {
    this._eventStream.push({
      eventName: 'activate'
    });
  }

  deactivate() {
    this._eventStream.push({
      eventName: 'deactivate'
    });
    (this._element:any).remove();
  }

  remove() {
    this.destroy();
  }
}
