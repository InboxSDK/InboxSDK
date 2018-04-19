/* @flow */

import includes from 'lodash/includes';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import * as ud from 'ud';

export type ButtonViewOptions = {
	text?: ?string;
	title?: ?string;
	tooltip?: ?string;
	enabled?: ?boolean;
	buttonColor?: ?string;
  isPrimary?: boolean;
};

const ModalButtonView = ud.defn(module, class ModalButtonView {
	_element: HTMLElement;
	_title: ?string;
	_tooltip: ?string;
	_buttonColor: string;
	_eventStream: Bus<any>;
  _isEnabled: boolean;

	constructor(options: ButtonViewOptions){
		this._isEnabled = options.enabled !== false;

		this._title = options.text || options.title;
		this._tooltip = options.tooltip || options.title;

		this._buttonColor = options.buttonColor || 'default';

		this._createElement(options);

		this._eventStream = kefirBus();
		this._setupEventStream();
	}

	destroy() {
		(this._element:Object).remove();
		this._eventStream.end();
	}

	getElement(): HTMLElement {return this._element;}
	getEventStream(): Kefir.Observable<Object> {return this._eventStream;}

	setEnabled(value: boolean){
		this._setEnabled(value);
	}

	isEnabled(): boolean {
		return this._isEnabled;
	}

	_createElement(options: ButtonViewOptions){
		this._element = document.createElement('button');

    if(options.isPrimary) this._element.classList.add('J-at1-auR');

    this._element.innerText = options.text || options.title || '';

    if (options.tooltip) {
			this._element.setAttribute('aria-label', options.tooltip);
		}
		this._element.setAttribute('role', 'button');
		this._element.setAttribute('tabindex', '0');

    if (options.tooltip || options.title) {
			this._element.setAttribute('data-tooltip', String(options.tooltip || options.title));
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

		this._eventStream.emit({
			eventName: 'enabledChanged',
			isEnabled: this._isEnabled
		});
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
});
export default ModalButtonView;
