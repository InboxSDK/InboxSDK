/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';

import type {DrawerViewDriver} from '../driver-interfaces/driver';

// documented in src/docs/
class DrawerView extends EventEmitter {
  destroyed: boolean = false;
  _driver: DrawerViewDriver;
  constructor(drawerViewDriver: DrawerViewDriver) {
    super();
    this._driver = drawerViewDriver;
    this._driver.getSlideAnimationDone().onValue(() => {
      this.emit('slideAnimationDone');
    });
    this._driver.getClosingStream().onValue(() => {
      this.emit('closing');
    });
    this._driver.getClosedStream().onValue(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
  }

  close(){
    this._driver.close();
  }
}

export default defn(module, DrawerView);
