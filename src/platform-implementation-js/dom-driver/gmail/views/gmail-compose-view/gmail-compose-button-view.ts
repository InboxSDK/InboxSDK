import includes from 'lodash/includes';
import * as Kefir from 'kefir';
import kefirBus, { Bus } from 'kefir-bus';
import Logger from '../../../../lib/logger';
import { simulateHover } from '../../../../lib/dom/simulate-mouse-event';
import keyboardShortcutStream from '../../../../lib/dom/keyboard-shortcut-stream';
import KeyboardShortcutHandle from '../../../../views/keyboard-shortcut-handle';
import { ButtonViewI } from '../../../../widgets/buttons/basic-button-view-controller';

export interface ButtonViewOptions {
  iconClass?: null | string;
  iconUrl?: null | string;
  title?: null | string;
  text?: null | string;
  tooltip?: null | string;
  enabled?: null | boolean;
  hasDropdown?: null | boolean;
  keyboardShortcutHandle?: null | KeyboardShortcutHandle;
  noOverflow?: null | boolean;
}

export default class GmailComposeButtonView implements ButtonViewI {
  private _element: HTMLElement = document.createElement('div');
  private _iconElement: HTMLDivElement = document.createElement('div');
  private _iconImgElement: null | undefined | HTMLImageElement;
  private _iconClass: null | undefined | string;
  private _iconUrl: null | undefined | string;
  private _tooltip: null | undefined | string;
  private _hasDropdown: boolean;
  private _isEnabled: boolean;
  private _keyboardShortcutHandle: null | undefined | KeyboardShortcutHandle;
  private _eventStream: Bus<any, any>;

  public constructor(options: ButtonViewOptions) {
    this._isEnabled = options.enabled !== false;

    this._iconClass = options.iconClass;
    this._iconUrl = options.iconUrl;

    this._tooltip = options.tooltip || options.title || options.text;

    // TODO what is this used for?
    this._hasDropdown = !!options.hasDropdown;

    this._keyboardShortcutHandle = options.keyboardShortcutHandle;

    this._createElement(options);

    this._eventStream = kefirBus();
    this._setupEventStream();
    this._setupAestheticEvents();
    if (options.enabled !== false) {
      this._setupKeyboardShortcutEvent();
    }
  }

  public destroy() {
    this._element.remove();
    this._eventStream.end();
  }

  public getElement(): HTMLElement {
    return this._element;
  }
  public getEventStream(): Kefir.Observable<any, any> {
    return this._eventStream;
  }

  public activate() {
    this.addClass('inboxsdk__composeButton_active');
  }

  public deactivate() {
    this.removeClass('inboxsdk__composeButton_active');
  }

  public addClass(className: string) {
    this._element.classList.add(className);
  }

  public removeClass(className: string) {
    this._element.classList.remove(className);
  }

  public simulateHover() {
    simulateHover(this._element);
  }

  public setEnabled(value: boolean) {
    this._setEnabled(value);
  }

  public isEnabled(): boolean {
    return this._isEnabled;
  }

  public update(options: any) {
    if (!options) {
      this._element.style.display = 'none';
      return;
    } else if (this._element.style.display === 'none') {
      this._element.style.display = '';
    }

    const newTooltip = options.tooltip || options.title || options.text;
    if (newTooltip != this._tooltip) {
      this._updateTooltip(newTooltip);
    }

    if (options.iconUrl != this._iconUrl) {
      this._updateIconUrl(options.iconUrl);
    }

    if (options.iconClass != this._iconClass) {
      this._updateIconClass(options.iconClass);
    }

    if (options.enabled === false || options.enabled === true) {
      this._setEnabled(options.enabled);
    }
  }

  private _createElement(options: ButtonViewOptions) {
    this._createMainElement(options);
    this._createIconElement();
  }

  private _createMainElement(options: ButtonViewOptions) {
    this._element.setAttribute('class', 'inboxsdk__composeButton');
    if (options.tooltip) {
      this._element.setAttribute('aria-label', options.tooltip);
    }
    this._element.setAttribute('role', 'button');
    this._element.setAttribute('tabindex', '0');

    const newTooltip = options.tooltip || options.title || options.text;
    if (newTooltip) {
      this._element.setAttribute('data-tooltip', newTooltip);
    }

    if (options.enabled === false) {
      this._element.classList.add('inboxsdk__button_disabled');
    }

    if (options.noOverflow) {
      this._element.setAttribute('data-no-overflow', '');
    }
  }

  private _createIconElement() {
    const iconElement = this._iconElement;

    if (this._iconClass) {
      iconElement.innerHTML = '&nbsp;';
      iconElement.setAttribute('class', this._iconClass);
    }

    iconElement.classList.add('inboxsdk__button_icon');

    this._element.appendChild(iconElement);

    if (this._iconUrl) {
      this._createIconImgElement();
    }
  }

  private _createIconImgElement() {
    this._iconElement.innerHTML = '';

    const iconImgElement = (this._iconImgElement =
      document.createElement('img'));
    iconImgElement.classList.add('inboxsdk__button_iconImg');

    if (this._iconUrl) {
      iconImgElement.src = this._iconUrl;
    } else {
      Logger.error(
        new Error(
          '_createIconImgElement should not be called with null _iconUrl'
        )
      );
    }

    this._iconElement.appendChild(iconImgElement);
  }

  private _updateTooltip(newTooltip: string | null | undefined) {
    this._tooltip = newTooltip;

    if (newTooltip) {
      this._element.setAttribute('data-tooltip', newTooltip);
    } else {
      this._element.removeAttribute('data-tooltip');
    }
  }

  private _updateIconUrl(newIconUrl: string | null | undefined) {
    this._iconUrl = newIconUrl;

    if (!newIconUrl && this._iconImgElement) {
      this._iconImgElement.remove();
      this._iconImgElement = null;
    } else if (newIconUrl && !this._iconImgElement) {
      this._createIconImgElement();
    } else if (newIconUrl && this._iconImgElement) {
      this._iconImgElement.src = newIconUrl;
    }
  }

  private _updateIconClass(newIconClass: string | null | undefined) {
    this._iconClass = newIconClass;
    this._iconElement.setAttribute(
      'class',
      'inboxsdk__button_icon ' + (newIconClass || '')
    );
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

    if (this._isEnabled) {
      this._setupKeyboardShortcutEvent();
    }
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

  private _setupKeyboardShortcutEvent() {
    const keyboardShortcutHandle = this._keyboardShortcutHandle;
    if (keyboardShortcutHandle) {
      this._eventStream.plug(
        keyboardShortcutStream(keyboardShortcutHandle.chord)
          .takeUntilBy(
            this._eventStream.filter(function (event) {
              return (
                event.eventName === 'enabledChanged' &&
                event.isEnabled === false
              );
            })
          )
          .map(function (domEvent) {
            return {
              eventName: 'click',
              domEvent: domEvent,
            };
          })
      );
    }
  }

  private _setupAestheticEvents() {
    Kefir.fromEvents(this._element, 'mouseenter')
      .filter(() => this.isEnabled())
      .onValue(() => {
        this._element.classList.add('inboxsdk__button_hover');
      });

    Kefir.fromEvents(this._element, 'mouseleave').onValue(() => {
      this._element.classList.remove('inboxsdk__button_hover');
    });
  }
}
