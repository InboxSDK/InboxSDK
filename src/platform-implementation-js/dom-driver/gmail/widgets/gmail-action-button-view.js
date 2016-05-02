/* @flow */

import {defn} from 'ud';
import once from 'lodash/function/once';
import isEqual from 'lodash/lang/isEqual';

class GmailActionButtonView {
	getElement: () => HTMLElement;
	_actionDescriptor: ?Object;

	constructor() {
		this.getElement = once(() => {
			const element = document.createElement('div');
			element.className = 'inboxsdk__gmail_action ';
			element.innerHTML = `
				<div>
				</div>`;
			return element;
		});
		this._actionDescriptor = null;
	}

	updateDescriptor(actionButtonDescriptor: ?Object) {
		if(!actionButtonDescriptor){
			this._actionDescriptor = actionButtonDescriptor;
			return;
		}

		if (isEqual(this._actionDescriptor, actionButtonDescriptor)) {
			return;
		}

		const element = this.getElement();

		this._updateTitle(actionButtonDescriptor.title);

		element.className = 'inboxsdk__gmail_action ' + (actionButtonDescriptor.className || '');

		this._actionDescriptor = actionButtonDescriptor;
	}

	_updateTitle(title: string){
		if(this._actionDescriptor && this._actionDescriptor.title === title){
			return;
		}
		const element = this.getElement();

		element.querySelector('div').textContent = title;
	}
}
export default defn(module, GmailActionButtonView);
