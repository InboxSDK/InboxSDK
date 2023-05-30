/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import includes from 'lodash/includes';
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import { ButtonViewI } from '../../../../widgets/buttons/basic-button-view-controller';

export interface ButtonViewOptions {
  text?: null | string;
  title?: null | string;
  tooltip?: null | string;
  enabled?: null | boolean;
  buttonColor?: null | string;
  isPrimary?: boolean;
}

export default class ModalButtonView implements ButtonViewI {
  private _element: HTMLElement = document.createElement('button');
  private _title: null | undefined | string;
  private _tooltip: null | undefined | string;
  private _buttonColor: string;
  private _eventStream = kefirBus<any, any>();
  private _isEnabled: boolean;

  constructor(options: ButtonViewOptions) {
    this._isEnabled = options.enabled !== false;

    this._title = options.text || options.title;
    this._tooltip = options.tooltip || options.title;

    this._buttonColor = options.buttonColor || 'default';

    this._createElement(options);

    this._eventStream = kefirBus();
    this._setupEventStream();
  }
  addClass(className: string): void {}
  removeClass(className: string): void {}
  activate(): void {}
  deactivate(): void {}

  destroy() {
    this._element.remove();
    this._eventStream.end();
  }

  getElement(): HTMLElement {
    return this._element;
  }
  getEventStream(): Kefir.Observable<any, any> {
    return this._eventStream;
  }

  setEnabled(value: boolean) {
    this._setEnabled(value);
  }

  update() {
    throw new Error('not implemented');
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }

  private _createElement(options: ButtonViewOptions) {
    if (options.isPrimary) this._element.classList.add('J-at1-auR');

    this._element.innerText = options.text || options.title || '';

    if (options.tooltip) {
      this._element.setAttribute('aria-label', options.tooltip);
    }
    this._element.setAttribute('role', 'button');
    this._element.setAttribute('tabindex', '0');

    if (options.tooltip || options.title) {
      this._element.setAttribute(
        'data-tooltip',
        String(options.tooltip || options.title)
      );
    }
  }

  private _setEnabled(value: boolean) {
    if (this._isEnabled === value) {
      return;
    }

    this._isEnabled = value;
    if (this._isEnabled) {
      this._element.classList.remove('inboxsdk__button_disabled');
    } else {
      this._element.classList.add('inboxsdk__button_disabled');
    }

    this._eventStream.emit({
      eventName: 'enabledChanged',
      isEnabled: this._isEnabled,
    });
  }

  private _setupEventStream() {
    const clickEventStream = Kefir.fromEvents<any, never>(
      this._element,
      'click'
    );

    clickEventStream.onValue(function (event) {
      event.stopPropagation();
      event.preventDefault();
    });

    this._eventStream.plug(
      clickEventStream
        .filter(() => this.isEnabled())
        .map(function (event) {
          return {
            eventName: 'click',
            domEvent: event,
          };
        })
    );

    const isEnterOrSpace = (event: any) =>
      includes([32 /* space */, 13 /* enter */], event.which);
    const keydownEventStream = Kefir.fromEvents<any, never>(
      this._element,
      'keydown'
    ).filter(() => this.isEnabled());
    const enterEventStream = keydownEventStream.filter(isEnterOrSpace);

    this._eventStream.plug(
      enterEventStream.map(function (event) {
        return {
          eventName: 'click',
          domEvent: event,
        };
      })
    );

    enterEventStream.onValue(function (event) {
      event.stopPropagation();
      event.preventDefault();
    });
  }
}
