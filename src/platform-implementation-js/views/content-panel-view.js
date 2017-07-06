/* @flow */

import Kefir from 'kefir';
import EventEmitter from '../lib/safe-event-emitter';

// documented in src/docs/
export default class ContentPanelView extends EventEmitter {
  destroyed: boolean = false;
  _contentPanelViewImplementation: Object;

  constructor(contentPanelViewImplementation: Object){
    super();

    this._contentPanelViewImplementation = contentPanelViewImplementation;
    this._bindToStreamEvents();
  }

  remove(){
    this._contentPanelViewImplementation.remove();
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
