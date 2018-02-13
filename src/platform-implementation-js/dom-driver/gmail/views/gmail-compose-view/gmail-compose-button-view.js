/* @flow */

import includes from 'lodash/includes';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import Logger from '../../../../lib/logger';
import * as ud from 'ud';
import {simulateHover} from '../../../../lib/dom/simulate-mouse-event';
import keyboardShortcutStream from '../../../../lib/dom/keyboard-shortcut-stream';
import type KeyboardShortcutHandle from '../../../../views/keyboard-shortcut-handle';

export type ButtonViewOptions = {
	iconClass?: ?string;
	iconUrl?: ?string;
	title?: ?string;
	tooltip?: ?string;
	enabled?: ?boolean;
	hasDropdown?: ?boolean;
	keyboardShortcutHandle?: ?KeyboardShortcutHandle;
};

const GmailComposeButtonView = ud.defn(module, class GmailComposeButtonView {
	_element: HTMLElement;
  _iconElement: HTMLDivElement;
  _iconImgElement: ?HTMLImageElement;
	_iconClass: ?string;
	_iconUrl: ?string;
	_tooltip: ?string;
	_hasDropdown: boolean;
	_buttonColor: string;
	_isEnabled: boolean;
	_keyboardShortcutHandle: ?KeyboardShortcutHandle;
	_eventStream: Bus<any>;

	constructor(options: ButtonViewOptions){
		this._hasDropdown = false;
		this._isEnabled = options.enabled !== false;

		this._iconClass = options.iconClass;
		this._iconUrl = options.iconUrl;

		this._tooltip = options.tooltip || options.title;

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

	destroy() {
		(this._element:Object).remove();
		this._eventStream.end();
	}

	getElement(): HTMLElement {return this._element;}
	getEventStream(): Kefir.Observable<Object> {return this._eventStream;}

	activate(){
    this.addClass('inboxsdk__composeButton_active');
	}

	deactivate(){
    this.removeClass('inboxsdk__composeButton_active');
	}

	addClass(className: string){
		this._element.classList.add(className);
	}

	removeClass(className: string){
		this._element.classList.remove(className);
	}

	simulateHover(){
		simulateHover(this._element);
	}

	setEnabled(value: boolean){
		this._setEnabled(value);
	}

	isEnabled(): boolean {
		return this._isEnabled;
	}

	update(options: ?Object){
		if (!options) {
			this._element.style.display = "none";
			return;
		} else if (this._element.style.display === "none") {
			this._element.style.display = "";
		}

    const newTooltip = options.tooltip || options.title;
		if(newTooltip != this._tooltip){
			this._updateTooltip(newTooltip);
		}

		if(options.iconUrl != this._iconUrl){
			this._updateIconUrl(options.iconUrl);
		}

		if(options.iconClass != this._iconClass){
			this._updateIconClass(options.iconClass);
		}

		if(options.enabled === false || options.enabled === true){
			this._setEnabled(options.enabled);
		}
	}

	_createElement(options: ButtonViewOptions){
		this._createMainElement(options);
    this._createIconElement();
	}

	_createMainElement(options: ButtonViewOptions){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'inboxsdk__composeButton');
		if (options.tooltip) {
			this._element.setAttribute('aria-label', options.tooltip);
		}
		this._element.setAttribute('role', 'button');
		this._element.setAttribute('tabindex', '0');

		if (options.tooltip || options.title) {
			this._element.setAttribute('data-tooltip', String(options.tooltip || options.title));
		}

		if (options.enabled === false) {
			this._element.classList.add('inboxsdk__button_disabled');
		}
	}

	_createIconElement(){
		const iconElement = this._iconElement = document.createElement('div');

		if(this._iconClass){
      iconElement.innerHTML = '&nbsp;';
			iconElement.setAttribute('class', this._iconClass);
		}

    iconElement.classList.add('inboxsdk__button_icon');

    this._element.appendChild(iconElement);

		if(this._iconUrl){
			this._createIconImgElement();
		}
	}

	_createIconImgElement(){
		this._iconElement.innerHTML = '';

		const iconImgElement = this._iconImgElement = document.createElement('img');
		iconImgElement.classList.add('inboxsdk__button_iconImg');

		if (this._iconUrl) {
			iconImgElement.src = this._iconUrl;
		} else {
			Logger.error(new Error('_createIconImgElement should not be called with null _iconUrl'));
		}

		this._iconElement.appendChild(iconImgElement);
	}

	_updateTooltip(newTooltip: ?string){
		this._tooltip = newTooltip;

		if(newTooltip){
			this._element.setAttribute('data-tooltip', newTooltip);
		}
		else{
			this._element.removeAttribute('data-tooltip');
		}
	}

	_updateIconUrl(newIconUrl: ?string){
		this._iconUrl = newIconUrl;

		if (this._iconImgElement && !newIconUrl) {
			(this._iconImgElement:Object).remove();
			this._iconImgElement = null;
		} else if (!this._iconImgElement && newIconUrl) {
			this._createIconImgElement();
		}
		if (this._iconImgElement && newIconUrl) {
			(this._iconImgElement: Object).src = newIconUrl;
		}
	}

	_updateIconClass(newIconClass: ?string){
		this._iconClass = newIconClass;
		this._iconElement.setAttribute('class', 'inboxsdk__button_icon '+(newIconClass||''));
	}

	_setEnabled(value: boolean){
		if(this._isEnabled === value){
			return;
		}

		this._isEnabled = value;
		if(this._isEnabled){
			this._element.classList.remove('inboxsdk__button_disabled');
		}
		else{
			this._element.classList.add('inboxsdk__button_disabled');
		}

		this._eventStream.emit({
			eventName: 'enabledChanged',
			isEnabled: this._isEnabled
		});

		if(this._isEnabled){
			this._setupKeyboardShortcutEvent();
		}
	}

	_setupEventStream(){
		const clickEventStream = Kefir.fromEvents(this._element, 'click');

		clickEventStream.onValue(function(event){
			event.stopPropagation();
			event.preventDefault();
		});

		this._eventStream.plug(
			clickEventStream.filter(() => this.isEnabled()).map(function(event){
				return {
					eventName: 'click',
					domEvent: event
				};
			})
		);

		const isEnterOrSpace = event => includes([32/* space */, 13/* enter */], event.which);
		const keydownEventStream = Kefir.fromEvents(this._element, 'keydown').filter(() => this.isEnabled());
		const enterEventStream = keydownEventStream.filter(isEnterOrSpace);

		this._eventStream.plug(
			enterEventStream.map(function(event){
				return {
					eventName: 'click',
					domEvent: event
				};
			})
		);

		enterEventStream.onValue(function(event){
			event.stopPropagation();
			event.preventDefault();
		});

	}

	_setupKeyboardShortcutEvent(){
		const keyboardShortcutHandle = this._keyboardShortcutHandle;
		if(keyboardShortcutHandle){
			this._eventStream.plug(
				keyboardShortcutStream(keyboardShortcutHandle.chord)
					.takeUntilBy(
						this._eventStream.filter(function(event){
							return event.eventName === 'enabledChanged' && event.isEnabled === false;
						})
					)
					.map(function(domEvent){
						return {
							eventName: 'click',
							domEvent: domEvent
						};
					})
			);
		}
	}

	_setupAestheticEvents(){
		Kefir.fromEvents(this._element, 'mouseenter')
			.filter(() => this.isEnabled())
			.onValue(event => {
				this._element.classList.add('inboxsdk__button_hover');
			});


		Kefir.fromEvents(this._element, 'mouseleave')
			.filter(() => this.isEnabled())
			.onValue(event => {
				this._element.classList.remove('inboxsdk__button_hover');
			});
	}
});
export default GmailComposeButtonView;
