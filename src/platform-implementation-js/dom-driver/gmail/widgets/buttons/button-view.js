/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Bacon = require('baconjs');
import Logger from '../../../../lib/logger';
import * as ud from 'ud';
import simulateHover from '../../../../lib/dom/simulate-hover';
var keyboardShortcutStream = require('../../../../lib/dom/keyboard-shortcut-stream');
import type KeyboardShortcutHandle from '../../../../views/keyboard-shortcut-handle';

var BUTTON_COLOR_CLASSES = require('./button-color-classes');

export type ButtonViewOptions = {
	hasButtonToLeft?: ?boolean;
	hasButtonToRight?: ?boolean;
	iconClass?: ?string;
	iconUrl?: ?string;
	text?: ?string;
	title?: ?string;
	tooltip?: ?string;
	hasDropdown?: ?boolean;
	buttonColor?: ?string;
	keyboardShortcutHandle?: ?KeyboardShortcutHandle;
};

var ButtonView = ud.defn(module, class ButtonView {
	_element: HTMLElement;
	_innerElement: any;
	_textElement: any;
	_iconElement: ?HTMLElement;
	_iconImgElement: ?HTMLImageElement;
	_iconClass: ?string;
	_iconUrl: ?string;
	_title: ?string;
	_tooltip: ?string;
	_hasDropdown: boolean;
	_buttonColor: string;
	_isEnabled: boolean;
	_keyboardShortcutHandle: ?KeyboardShortcutHandle;
	_eventStream: Bacon.Bus;

	constructor(options: ButtonViewOptions){
		this._hasDropdown = false;
		this._isEnabled = true;

		this._iconClass = options.iconClass;
		this._iconUrl = options.iconUrl;

		this._title = options.text || options.title;
		this._tooltip = options.tooltip || options.title;

		this._hasDropdown = !!options.hasDropdown;

		this._buttonColor = options.buttonColor || 'default';

		this._keyboardShortcutHandle = options.keyboardShortcutHandle;

		this._createElement(options);

		this._eventStream = new Bacon.Bus();
		this._setupEventStream();
		this._setupAestheticEvents();
		this._setupKeyboardShortcutEvent();
	}

	destroy() {
		(this._element:Object).remove();
		this._eventStream.end();
	}

	getElement(): HTMLElement {return this._element;}
	getEventStream(): Bacon.Observable {return this._eventStream;}

	activate(){
		this.addClass(BUTTON_COLOR_CLASSES[this._buttonColor].ACTIVE_CLASS);
		this.addClass(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
	}

	deactivate(){
		this.removeClass(BUTTON_COLOR_CLASSES[this._buttonColor].ACTIVE_CLASS);
		this.removeClass(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
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

		if(options.buttonColor != this._buttonColor && this._buttonColor){
			this._updateButtonColor(options.buttonColor);
		}

		if(options.title != this._title){
			this._updateTitle(options.title);
		}

		if(options.tooltip != this._tooltip){
			this._updateTooltip(options.tooltip);
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

		this._createInnerElement(options);

		this._createTextElement(options);
		this._createIconElement(options);
	}

	_createMainElement(options: ButtonViewOptions){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'T-I J-J5-Ji ar7 L3 inboxsdk__button ' + BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS);

		if(options.hasButtonToRight){
			this._element.classList.add('T-I-Js-IF');
		}

		if (options.hasButtonToLeft) {
			this._element.classList.add('T-I-Js-Gs');
		}

		if(options.tooltip || options.title){
			this._element.setAttribute('data-tooltip', String(options.tooltip || options.title));
		}
	}

	_createInnerElement(options: ButtonViewOptions){
		this._innerElement = document.createElement('div');

		if(this._hasDropdown && !options.noArrow){
			this._innerElement.innerHTML = '<div class="G-asx T-I-J3 - J-J5-Ji">&nbsp;</div>';
		}

		this._element.appendChild(this._innerElement);
	}

	_createTextElement(){
		if(!this._title){
			return;
		}

		this._textElement = document.createElement('span');
		this._textElement.setAttribute('class', 'inboxsdk__button_text');
		this._textElement.textContent = this._title;

		if(this._iconElement){
			var parent = this._iconElement.parentElement;
			if (!parent) throw new Error("Could not find parent");
			parent.insertBefore(this._textElement, this._iconElement.nextSibling);
		} else {
			this._innerElement.insertBefore(this._textElement, this._innerElement.firstElementChild);
		}
	}

	_createIconElement(){
		if(!this._iconClass && !this._iconUrl){
			return;
		}

		var iconElement = this._iconElement = document.createElement('div');
		iconElement.classList.add('inboxsdk__button_icon');
		iconElement.innerHTML = '&nbsp;';

		if(this._iconClass){
			iconElement.setAttribute('class', 'inboxsdk__button_icon ' + this._iconClass);
		}

		if(this._iconUrl){
			this._createIconImgElement();
		}

		this._innerElement.insertBefore(iconElement, this._innerElement.firstElementChild);
	}

	_createIconImgElement(){
		if (!this._iconElement) {
			this._createIconElement();
		}
		var iconElement = this._iconElement;
		if (!iconElement) throw new Error("Should not happen");
		iconElement.innerHTML = '';

		var iconImgElement = this._iconImgElement = document.createElement('img');
		iconImgElement.classList.add('inboxsdk__button_iconImg');

		if (this._iconUrl) {
			iconImgElement.src = this._iconUrl;
		} else {
			Logger.error(new Error('_createIconImgElement should not be called with null _iconUrl'));
		}

		iconElement.appendChild(iconImgElement);
	}

	_updateButtonColor(newButtonColor: string){
		this._element.classList.remove(BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS);
		this._buttonColor = newButtonColor;

		this._element.classList.add(BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS);
	}

	_updateTitle(newTitle: ?string){
		if(!this._title && newTitle){
			this._title = newTitle;
			this._createTextElement();
		}
		else if(this._title && !newTitle && this._textElement){
			(this._textElement:Object).remove();
			this._textElement = null;
			this._title = newTitle;
		}
		else if (this._textElement){
			this._textElement.textContent = newTitle;
			this._title = newTitle;
		}
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
			this._iconImgElement.src = newIconUrl;
		}
	}

	_updateIconClass(newIconClass: ?string){
		if (this._iconElement && !newIconClass && !this._iconUrl) {
			(this._iconElement:Object).remove();
			this._iconElement = null;
		} else if (!this._iconElement && newIconClass) {
			this._createIconElement();
		}
		this._iconClass = newIconClass;
		if (this._iconElement) {
			this._iconElement.setAttribute('class', 'inboxsdk__button_icon '+(newIconClass||''));
		}
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

		this._eventStream.push({
			eventName: 'enabledChanged',
			isEnabled: this._isEnabled
		});

		if(this._isEnabled){
			this._setupKeyboardShortcutEvent();
		}
	}

	_setupEventStream(){
		var self = this;

		var clickEventStream = Bacon.fromEventTarget(this._element, 'click');

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

		var isEnterOrSpace = event => _.includes([32 /* space */, 13 /* enter */], event.which);
		var keydownEventStream = Bacon.fromEventTarget(this._element, 'keydown').filter(() => this.isEnabled());
		var enterEventStream = keydownEventStream.filter(isEnterOrSpace);

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
		var keyboardShortcutHandle = this._keyboardShortcutHandle;
		if(keyboardShortcutHandle){
			this._eventStream.plug(
				keyboardShortcutStream(keyboardShortcutHandle.chord)
					.takeUntil(
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
		Bacon.fromEventTarget(this._element, 'mouseenter')
			.filter(() => this.isEnabled())
			.onValue(event => {
				this._element.classList.add(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
				this._element.classList.add('inboxsdk__button_hover');
			});


		Bacon.fromEventTarget(this._element, 'mouseleave')
			.filter(() => this.isEnabled())
			.onValue(event => {
				this._element.classList.remove(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
				this._element.classList.remove('inboxsdk__button_hover');
			});
	}
});
export default ButtonView;
