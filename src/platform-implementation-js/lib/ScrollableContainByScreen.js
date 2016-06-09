/* @flow */

import containByScreen from 'contain-by-screen';
import type {Options} from 'contain-by-screen';

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import fromEventsWithOptions from './fromEventsWithOptions';

export default class ScrollableContainByScreen {
  _manualRepositions: Kefir.Bus = kefirBus();
  _stopper: Kefir.Stream&{destroy(): void} = kefirStopper();

  constructor(element: HTMLElement, anchorPoint: HTMLElement, options: Options) {
    Kefir.merge([
      this._manualRepositions,
      Kefir.fromEvents(window, 'resize'),
      fromEventsWithOptions(window, 'scroll', {capture: true, passive: true})
        .filter(event => event.target.contains(anchorPoint))
    ])
      .toProperty(() => null)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        containByScreen(element, anchorPoint, options);
      });
  }

  reposition() {
    this._manualRepositions.emit(null);
  }

  destroy() {
    this._stopper.destroy();
  }
}
