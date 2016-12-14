/* @flow */

import {defn} from 'ud';
import isEqual from 'lodash/isEqual';
import querySelector from '../../../lib/dom/querySelectorOrFail';

class GmailActionButtonView {
	_element: HTMLElement;
	_actionDescriptor: ?Object;

	constructor() {
		this._element = document.createElement('div');
		this._element.tabIndex = 0;
		this._element.setAttribute('role', 'button');
		this._element.className = 'inboxsdk__gmail_action ';
		this._element.innerHTML = `
			<div>
			</div>`;

		this._actionDescriptor = null;
	}

	getElement(): HTMLElement {
		return this._element;
	}

	updateDescriptor(actionButtonDescriptor: ?Object) {
		if(!actionButtonDescriptor){
			this._actionDescriptor = actionButtonDescriptor;
			return;
		}

		if (isEqual(this._actionDescriptor, actionButtonDescriptor)) {
			return;
		}

		this._updateTitle(actionButtonDescriptor.title);

		this._element.className = 'inboxsdk__gmail_action ' + (actionButtonDescriptor.className || '');

		this._actionDescriptor = actionButtonDescriptor;
	}

	setOnClick(callback: ?(event: MouseEvent) => void) {
		(this._element: any).onclick = callback;
	}

	_updateTitle(title: string){
		if(this._actionDescriptor && this._actionDescriptor.title === title){
			return;
		}

		querySelector(this._element, 'div').textContent = title;
	}
}
export default defn(module, GmailActionButtonView);
