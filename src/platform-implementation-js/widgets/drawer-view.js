/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';
import ComposeView from '../views/compose-view';

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
    document.dispatchEvent(new CustomEvent('inboxSDKcloseDrawers', {
      bubbles: false, cancelable: false, detail: null
    }));
    Kefir.fromEvents(document, 'inboxSDKcloseDrawers')
      .takeUntilBy(Kefir.fromEvents(this, 'closing'))
      .onValue(() => {
        this.close();
      });
  }

  close(){
    this._driver.close();
  }

  associateComposeView(
    composeView: ComposeView,
    closeWithCompose: boolean,
    closeOnMinimize: boolean
  ) {
    if (!(composeView instanceof ComposeView))
      throw new Error('argument was not a ComposeView');
    this._driver.associateComposeView(composeView, closeWithCompose, closeOnMinimize);
  }
}

export default defn(module, DrawerView);
