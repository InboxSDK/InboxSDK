import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

// GmailComposeButtonView | ButtonView | CreateAccessoryButtonView | ModalButtonView
export interface ButtonViewI {
  update(options: Options): void;
  getEventStream(): Kefir.Observable<any, any>;
  getElement(): HTMLElement;
  setEnabled(enabled: boolean): void;
  destroy(): void;
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

  public constructor(options: Options) {
    this._activateFunction = options.activateFunction || options.onClick;
    this._view = options.buttonView;

    this._view
      .getEventStream()
      .filter((event) => event.eventName === 'click')
      .onValue(() => {
        this.activate();
      });
  }

  public getStopper(): Kefir.Observable<null, never> {
    return this._stopper;
  }

  public destroy() {
    this._activateFunction = null;
    this._view.destroy();
    this._stopper.destroy();
  }

  public update(options: Options) {
    this.getView().update(options);
    this.setActivateFunction(
      options && (options.activateFunction || options.onClick)
    );
  }

  public getView(): ButtonViewI {
    return this._view;
  }

  public setActivateFunction(f: null | undefined | ((event: any) => void)) {
    this._activateFunction = f;
  }

  public activate() {
    if (this._activateFunction) {
      this._activateFunction({});
    }
  }
}
