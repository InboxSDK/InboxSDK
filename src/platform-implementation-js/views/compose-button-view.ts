import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import {
  ComposeButtonDescriptor,
  ComposeViewDriver,
} from '../driver-interfaces/compose-view-driver';
import { Driver } from '../driver-interfaces/driver';
import { AddedButtonEvents } from '../dom-driver/gmail/views/gmail-compose-view/add-button';
import { Bus } from 'kefir-bus';
import BasicButtonViewController from '../widgets/buttons/basic-button-view-controller';

export interface TooltipDescriptor {
  el?: null | HTMLElement;
  title?: null | string;
  subtitle?: null | string;
  imageUrl?: null | string;
  button?: null | { onClick?: Function; title: string };
}

export interface Options {
  buttonDescriptor: ComposeButtonDescriptor | null | undefined;
  buttonViewController: any;
}
const memberMap = new WeakMap<
  ComposeButtonView,
  {
    driver: Driver;
    composeViewDriver: ComposeViewDriver;
  }
>();

export default class ComposeButtonView extends EventEmitter {
  destroyed: boolean = false;
  #addedEventBus;

  constructor(
    addedEventBus: Bus<AddedButtonEvents, unknown>,
    composeViewDriver: ComposeViewDriver,
    driver: Driver,
  ) {
    super();
    this.#addedEventBus = addedEventBus;
    const members = { composeViewDriver, driver };
    memberMap.set(this, members);

    this.#addedEventBus.toProperty().onValue((options) => {
      if (!options) {
        _destroy(this);
        return;
      }

      members.composeViewDriver.getStopper().onValue(() => {
        _destroy(this);
      });
    });
  }

  showTooltip(tooltipDescriptor: TooltipDescriptor) {
    const members = get(memberMap, this);
    members.driver
      .getLogger()
      .eventSdkPassive('ComposeButtonView.showTooltip', {
        keys: Object.keys(tooltipDescriptor),
      });
    this.#addedEventBus.onValue((options) => {
      if (!options) return;
      members.composeViewDriver.addTooltipToButton(
        options.buttonViewController as BasicButtonViewController,
        options.buttonDescriptor!,
        tooltipDescriptor,
      );
    });
  }

  closeTooltip() {
    const members = get(memberMap, this);
    this.#addedEventBus.onValue((options) => {
      if (!options) return;
      members.composeViewDriver.closeButtonTooltip(
        options.buttonViewController!,
      );
    });
  }
}

function _destroy(composeButtonViewInstance: ComposeButtonView) {
  composeButtonViewInstance.destroyed = true;
  composeButtonViewInstance.emit('destroy');
}
