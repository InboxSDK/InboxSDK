/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';

import type {DrawerViewDriver} from '../driver-interfaces/driver';

// TODO document in src/docs/
class DrawerView extends EventEmitter {
  destroyed: boolean = false;
  _driver: DrawerViewDriver;
  constructor(drawerViewDriver: DrawerViewDriver) {
    super();
    this._driver = drawerViewDriver;
    this._driver.getStopper().onValue(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
  }

  close(){
    if (this._driver) {
      this._driver.destroy();
    }
  }
}

export default defn(module, DrawerView);
