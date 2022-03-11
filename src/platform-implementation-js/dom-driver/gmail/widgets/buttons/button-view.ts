import includes from 'lodash/includes';
import * as Kefir from 'kefir';
import kefirBus, { Bus } from 'kefir-bus';
import Logger from '../../../../lib/logger';
import { simulateHover } from '../../../../lib/dom/simulate-mouse-event';
import keyboardShortcutStream from '../../../../lib/dom/keyboard-shortcut-stream';
import KeyboardShortcutHandle from '../../../../views/keyboard-shortcut-handle';

import BUTTON_COLOR_CLASSES from './button-color-classes';
import { ButtonViewI } from '../../../../widgets/buttons/basic-button-view-controller';

export interface ButtonViewOptions {
  hasButtonToLeft?: boolean | null;
  hasButtonToRight?: boolean | null;
  iconClass?: string | null;
  iconUrl?: string | null;
  text?: string | null;
  title?: string | null;
  tooltip?: string | null;
  enabled?: boolean | null;
  hasDropdown?: boolean | null;
  buttonColor?: string | null;
  keyboardShortcutHandle?: KeyboardShortcutHandle | null;
  noArrow?: boolean | null;
}

export default class ButtonView implements ButtonViewI {
  private _element: HTMLElement = document.createElement('div');
  private _innerElement: HTMLElement = document.createElement('div');
  private _textElement: HTMLElement | undefined;
  private _iconElement: HTMLElement | undefined;
  private _iconImgElement: HTMLImageElement | undefined;
  private _iconClass: string | null | undefined;
  private _iconUrl: string | null | undefined;
  private _title: string | null | undefined;
  private _tooltip: string | null | undefined;
  private _hasDropdown: boolean;
  private _buttonColor: string;
  private _isEnabled: boolean;
  private _keyboardShortcutHandle: KeyboardShortcutHandle | null | undefined;
  private _eventStream: Bus<any, any>;

  public constructor(options: ButtonViewOptions) {
    this._hasDropdown = false;
    this._isEnabled = options.enabled !== false;

    this._iconClass = options.iconClass;
    this._iconUrl = options.iconUrl;

    this._title = options.text || options.title;
    this._tooltip = options.tooltip || options.title;

    this._hasDropdown = !!options.hasDropdown;

    this._buttonColor = options.buttonColor || 'default';

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
    this.addClass(BUTTON_COLOR_CLASSES[this._buttonColor].ACTIVE_CLASS);
    this.addClass(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
  }

  public deactivate() {
    this.removeClass(BUTTON_COLOR_CLASSES[this._buttonColor].ACTIVE_CLASS);
    this.removeClass(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
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

    if (options.buttonColor != this._buttonColor && this._buttonColor) {
      this._updateButtonColor(options.buttonColor);
    }

    if (options.title != this._title) {
      this._updateTitle(options.title);
    }

    if (options.tooltip != this._tooltip) {
      this._updateTooltip(options.tooltip);
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
    this._setupMainElement(options);
    this._setupInnerElement(options);

    this._createTextElement();
    this._createIconElement();
  }

  private _setupMainElement(options: ButtonViewOptions) {
    this._element.setAttribute(
      'class',
      'T-I J-J5-Ji ar7 inboxsdk__button ' +
        BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS
    );
    if (options.tooltip) {
      this._element.setAttribute('aria-label', options.tooltip);
    }
    this._element.setAttribute('role', 'button');
    this._element.setAttribute('tabindex', '0');

    if (options.hasButtonToRight) {
      this._element.classList.add('T-I-Js-IF');
    }

    if (options.hasButtonToLeft) {
      this._element.classList.add('T-I-Js-Gs');
    }

    if (options.tooltip || options.title) {
      this._element.setAttribute(
        'data-tooltip',
        String(options.tooltip || options.title)
      );
    }

    if (options.enabled === false) {
      this._element.classList.add('inboxsdk__button_disabled');
    }
  }

  private _setupInnerElement(options: ButtonViewOptions) {
    this._innerElement.classList.add('asa');

    if (this._hasDropdown && !options.noArrow) {
      this._innerElement.innerHTML =
        '<div class="G-asx T-I-J3 - J-J5-Ji">&nbsp;</div>';
    }

    this._element.appendChild(this._innerElement);
  }

  private _createTextElement() {
    if (!this._title) {
      return;
    }

    this._textElement = document.createElement('span');
    this._textElement.setAttribute('class', 'inboxsdk__button_text');
    this._textElement.textContent = this._title;

    if (this._iconElement) {
      const parent = this._iconElement.parentElement;
      if (!parent) throw new Error('Could not find parent');
      parent.insertBefore(this._textElement, this._iconElement.nextSibling);
    } else {
      this._innerElement.insertBefore(
        this._textElement,
        this._innerElement.firstElementChild
      );
    }
  }

  private _createIconElement() {
    if (!this._iconClass && !this._iconUrl) {
      return;
    }

    const iconElement = (this._iconElement = document.createElement('div'));
    iconElement.classList.add('inboxsdk__button_icon');

    if (this._iconClass) {
      iconElement.innerHTML = '&nbsp;';
      iconElement.setAttribute(
        'class',
        'inboxsdk__button_icon ' + this._iconClass
      );
    }

    if (this._iconUrl) {
      this._createIconImgElement();
    }

    this._innerElement.insertBefore(
      iconElement,
      this._innerElement.firstElementChild
    );
  }

  private _createIconImgElement() {
    if (!this._iconElement) {
      this._createIconElement();
    }
    const iconElement = this._iconElement;
    if (!iconElement) throw new Error('Should not happen');
    if (iconElement.innerHTML !== '') {
      iconElement.innerHTML = '';
    }

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

    iconElement.appendChild(iconImgElement);
  }

  private _updateButtonColor(newButtonColor: string) {
    this._element.classList.remove(
      BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS
    );
    this._buttonColor = newButtonColor;

    this._element.classList.add(
      BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS
    );
  }

  private _updateTitle(newTitle: string | null | undefined) {
    if (!this._title && newTitle) {
      this._title = newTitle;
      this._createTextElement();
    } else if (this._title && !newTitle && this._textElement) {
      this._textElement.remove();
      this._textElement = undefined;
      this._title = newTitle;
    } else if (this._textElement) {
      this._textElement.textContent = newTitle as string;
      this._title = newTitle;
    }
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
    if (this._iconImgElement && !newIconUrl) {
      this._iconImgElement.remove();
      this._iconImgElement = undefined;
    } else if (!this._iconImgElement && newIconUrl) {
      this._createIconImgElement();
    }
    if (this._iconImgElement && newIconUrl) {
      this._iconImgElement.src = newIconUrl;
    }
  }

  private _updateIconClass(newIconClass: string | null | undefined) {
    if (this._iconElement && !newIconClass && !this._iconUrl) {
      this._iconElement.remove();
      this._iconElement = undefined;
    } else if (!this._iconElement && newIconClass) {
      this._createIconElement();
    }
    this._iconClass = newIconClass;
    if (this._iconElement) {
      this._iconElement.setAttribute(
        'class',
        'inboxsdk__button_icon ' + (newIconClass || '')
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
        this._element.classList.add(
          BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS
        );
        this._element.classList.add('inboxsdk__button_hover');
      });

    Kefir.fromEvents(this._element, 'mouseleave').onValue(() => {
      this._element.classList.remove(
        BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS
      );
      this._element.classList.remove('inboxsdk__button_hover');
    });

    Kefir.fromEvents(this._element, 'focus').onValue(() => {
      this._element.classList.add('T-I-JO');
    });

    Kefir.fromEvents(this._element, 'blur').onValue(() => {
      this._element.classList.remove('T-I-JO');
    });
  }
}
