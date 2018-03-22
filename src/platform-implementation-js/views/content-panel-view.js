/* @flow */

import Kefir from 'kefir';
import EventEmitter from '../lib/safe-event-emitter';

import type ContentPanelViewDriver from '../driver-common/sidebar/ContentPanelViewDriver';

// documented in src/docs/
export default class ContentPanelView extends EventEmitter {
  destroyed: boolean = false;
  _contentPanelViewImplementation: ContentPanelViewDriver;

  constructor(contentPanelViewImplementation: ContentPanelViewDriver){
    super();

    this._contentPanelViewImplementation = contentPanelViewImplementation;
    this._bindToStreamEvents();
  }

  remove(){
    this._contentPanelViewImplementation.remove();
  }

  close(){
    this._contentPanelViewImplementation.close();
  }

  _bindToStreamEvents(){
    const stream: Kefir.Observable<any> = this._contentPanelViewImplementation.getEventStream();
    stream.onValue(({eventName}) => {this.emit(eventName);});
    stream.onEnd(() => {
        this.destroyed = true;
        this.emit('destroy');
    });
  }

}
