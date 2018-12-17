/* @flow */

import GenericButtonView from '../../../../lib/dom/generic-button-view';

export default class InboxDropdownButtonView extends GenericButtonView {
	_element: HTMLElement; // inherited

	constructor() {
		const element = document.createElement('div');
		element.setAttribute('class', 'aAE qi J-J5-Ji J-JN-M-I');

		element.innerHTML = '<div class="J-J5-Ji J-JN-M-I-JG">&nbsp;</div>';

		element.addEventListener('mouseenter', function() {
			element.classList.add('J-JN-M-I-JW');
		});

		element.addEventListener('mouseleave', function() {
			element.classList.remove('J-JN-M-I-JW');
		});

		super(element);
	}

	activate(){
		this._element.classList.add('J-JN-M-I-JO');
		this._element.classList.add('J-JN-M-I-Kq');
	}

	deactivate(){
		this._element.classList.remove('J-JN-M-I-JO');
		this._element.classList.remove('J-JN-M-I-Kq');
	}
}
