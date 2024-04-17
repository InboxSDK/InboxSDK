import ModalView from '../widgets/modal-view';
import type { Driver } from '../driver-interfaces/driver';
import type { PiOpts } from '../platform-implementation';

/**
 * @deprecated applications should use Widgets instead.
 */
class Modal {
  #driver: Driver;
  #piOpts: PiOpts;

  constructor(appId: string, driver: Driver, piOpts: PiOpts) {
    this.#driver = driver;
    this.#piOpts = piOpts;
  }

  /**
   * @deprecated use Widgets.showModalView
   */
  show(options: Record<string, any>): ModalView {
    const driver = this.#driver;

    if (this.#piOpts.REQUESTED_API_VERSION < 2) {
      driver
        .getLogger()
        .deprecationWarning('Modal.show', 'Widgets.showModalView');
    }

    const modalViewDriver = driver.createModalViewDriver(options);
    const modalView = new ModalView({
      driver,
      modalViewDriver,
    });
    modalView.show();
    return modalView;
  }

  // Deprecated, does not have an exact replacement. Use Widgets.showModalView.
  createModalView(options: Record<string, any>): ModalView {
    const driver = this.#driver;
    driver
      .getLogger()
      .deprecationWarning('Modal.createModalView', 'Widgets.showModalView');
    const modalViewDriver = driver.createModalViewDriver(options);
    return new ModalView({
      driver,
      modalViewDriver,
    });
  }
}

export default Modal;
