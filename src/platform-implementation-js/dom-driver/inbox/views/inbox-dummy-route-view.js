/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';

import type {RouteViewDriver} from '../../../driver-interfaces/route-view-driver';

export default class InboxDummyRouteView {
  _type: string;
  _eventStream = kefirBus();
  _stopper = kefirStopper();

  constructor(type: string) {
    // Check we implement interface
    (this: RouteViewDriver);
    this._type = type;
  }

  getStopper() {
    return this._stopper;
  }

  destroy(){
    this._eventStream.end();
    this._stopper.destroy();
  }

  getElement(): HTMLElement {
    throw new Error('Should not happen');
  }

  getType(): string {
    return this._type;
  }

  getRouteType(): string {
    return 'UNKNOWN';
  }

  getRouteID(): string {
    return 'UNKNOWN';
  }

  getParams(): Object {
    return {};
  }

  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }

  getCustomViewElement(): ?HTMLElement{
    return null;
  }

  refresh() {
    // stub
  }

  getHash(): string {
    throw new Error('should not happen');
  }

  addCollapsibleSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any) {
    throw new Error('should not happen');
  }

  addSection(sectionDescriptorProperty: Kefir.Observable<?Object>, groupOrderHint: any) {
    throw new Error('should not happen');
  }

  setFullWidth(fullWidth: boolean) {
    throw new Error('should not happen');
  }
}
