/* @flow */

import {defn, defonce} from 'ud';
import ModalView from '../widgets/modal-view';
import get from '../../common/get-or-fail';
import type {Driver} from '../driver-interfaces/driver';
import type {PiOpts} from '../platform-implementation';

const memberMap = defonce(module, () => new WeakMap());

// Deprecated, applications should use Widgets instead.
class Modal {
  constructor(appId: string, driver: Driver, piOpts: PiOpts) {
    const members = {appId, driver, piOpts};
    memberMap.set(this, members);
  }

  // Deprecated, use Widgets.showModalView
  show(options: Object): ModalView {
    const driver = get(memberMap, this).driver;
    if (get(memberMap, this).piOpts.inboxBeta) {
      driver.getLogger().deprecationWarning('Modal.show', 'Widgets.showModalView');
    }
    const modalViewDriver = driver.createModalViewDriver(options);
    const modalView = new ModalView({driver, modalViewDriver});
    modalView.show();

    return modalView;
  }

  // Deprecated, does not have an exact replacement. Use Widgets.showModalView.
  createModalView(options: Object): ModalView {
    const driver = get(memberMap, this).driver;
    driver.getLogger().deprecationWarning('Modal.createModalView', 'Widgets.showModalView');

    const modalViewDriver = driver.createModalViewDriver(options);
    return new ModalView({driver, modalViewDriver});
  }
}

export default defn(module, Modal);
