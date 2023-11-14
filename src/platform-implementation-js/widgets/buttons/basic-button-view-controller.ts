import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

// GmailComposeButtonView | ButtonView | CreateAccessoryButtonView | ModalButtonView
export interface ButtonViewI {
  addClass(className: string): void;
  removeClass(className: string): void;
  update(options: Options): void;
  getEventStream(): Kefir.Observable<any, any>;
  getElement(): HTMLElement;
  setEnabled(enabled: boolean): void;
  destroy(): void;
  activate(): void;
  deactivate(): void;
}

export interface Options {
  activateFunction?: null | ((event: any) => void);
  onClick?: null | (() => void);
  buttonView: ButtonViewI;
}

export default class BasicButtonViewController {
  private _activateFunction: null | undefined | ((event: any) => void);
  private _view: ButtonViewI;
  private _stopper = kefirStopper();

  constructor(options: Options) {
    this._activateFunction = options.activateFunction || options.onClick;
    this._view = options.buttonView;

    this._view
      .getEventStream()
      .filter((event) => event.eventName === 'click')
      .onValue(() => {
        this.activate();
      });
  }

  getStopper(): Kefir.Observable<null, never> {
    return this._stopper;
  }

  destroy() {
    this._activateFunction = null;
    this._view.destroy();
    this._stopper.destroy();
  }

  update(options: Options) {
    this.getView().update(options);
    this.setActivateFunction(
      options && (options.activateFunction || options.onClick),
    );
  }

  getView(): ButtonViewI {
    return this._view;
  }

  setActivateFunction(f: null | undefined | ((event: any) => void)) {
    this._activateFunction = f;
  }

  activate() {
    if (this._activateFunction) {
      this._activateFunction({});
    }
  }
}
