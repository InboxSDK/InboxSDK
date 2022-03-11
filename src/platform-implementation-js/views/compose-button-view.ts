import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import { ComposeViewDriver } from '../driver-interfaces/compose-view-driver';
import { Driver } from '../driver-interfaces/driver';

export interface TooltipDescriptor {
  el?: null | HTMLElement;
  title?: null | string;
  subtitle?: null | string;
  imageUrl?: null | string;
  button?: null | { onClick?: Function; title: string };
}

interface Options {
  buttonDescriptor: any;
  buttonViewController: any;
}
const memberMap = new WeakMap<
  ComposeButtonView,
  {
    driver: Driver;
    optionsPromise: Promise<Options | null | undefined>;
    composeViewDriver: ComposeViewDriver;
  }
>();

export default class ComposeButtonView extends EventEmitter {
  public destroyed: boolean = false;

  public constructor(
    optionsPromise: Promise<Options | null | undefined>,
    composeViewDriver: ComposeViewDriver,
    driver: Driver
  ) {
    super();
    const members = { optionsPromise, composeViewDriver, driver };
    memberMap.set(this, members);

    members.optionsPromise.then((options) => {
      if (!options) {
        _destroy(this);
        return;
      }

      members.composeViewDriver.getStopper().onValue(() => {
        _destroy(this);
      });
    });
  }

  public showTooltip(tooltipDescriptor: TooltipDescriptor) {
    const members = get(memberMap, this);
    members.driver
      .getLogger()
      .eventSdkPassive('ComposeButtonView.showTooltip', {
        keys: Object.keys(tooltipDescriptor),
      });
    members.optionsPromise.then((options) => {
      if (!options) return;
      members.composeViewDriver.addTooltipToButton(
        options.buttonViewController,
        options.buttonDescriptor,
        tooltipDescriptor
      );
    });
  }

  public closeTooltip() {
    const members = get(memberMap, this);
    members.optionsPromise.then((options) => {
      if (!options) return;
      members.composeViewDriver.closeButtonTooltip(
        options.buttonViewController
      );
    });
  }
}

function _destroy(composeButtonViewInstance: ComposeButtonView) {
  composeButtonViewInstance.destroyed = true;
  composeButtonViewInstance.emit('destroy');
}
