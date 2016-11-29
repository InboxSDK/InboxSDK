/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import cx from 'classnames';

import idMap from '../../../lib/idMap';
import getSidebarClassnames from '../getSidebarClassnames';
import type {RouteViewDriver} from '../../../driver-interfaces/route-view-driver';

export default class InboxCustomRouteView {
  _routeID: string;
  _params: Object;
  _eventStream = kefirBus();
  _stopper = kefirStopper();
  _customViewElement: HTMLElement;

  constructor(routeID: string, params: Object) {
    // Check we implement interface
    (this: RouteViewDriver);
    this._routeID = routeID;
    this._params = params;
    this._customViewElement = document.createElement('div');
    this.setFullWidth(true);
  }

  setFullWidth(fullWidth: boolean) {
    const centerListClassName = getSidebarClassnames().centerList || 'UNKNOWN_centerList';
    this._customViewElement.className = cx(idMap('custom_view_container'), {
      [idMap('custom_view_min_margins')]: fullWidth,
      [centerListClassName]: !fullWidth
    });
  }

  getStopper() {
    return this._stopper;
  }

  destroy(){
    this._eventStream.end();
    this._stopper.destroy();
    this._customViewElement.remove();
  }

  getElement(): HTMLElement {
    throw new Error('should not happen');
  }

  getType(): string {
    return 'CUSTOM';
  }

  getRouteType(): string {
    return 'CUSTOM';
  }

  getRouteID(): string {
    return this._routeID;
  }

  getParams(): Object {
    return this._params;
  }

  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }

  getCustomViewElement(): ?HTMLElement{
    return this._customViewElement;
  }

  refresh() {
    throw new Error('should not happen');
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
}
