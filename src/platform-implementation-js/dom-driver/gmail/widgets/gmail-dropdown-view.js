/* @flow */

import blockAndReemiteKeyboardEvents from '../../../lib/dom/block-and-reemit-keyboard-events';

export default class GmailDropdownView {
	_containerElement: HTMLElement;
	_contentElement: HTMLElement;

	constructor() {
		this._setupElement();
	}

	_setupElement() {
		this._containerElement = document.createElement('div');
		this._containerElement.setAttribute('class', 'inboxsdk__menu');

		this._contentElement = document.createElement('div');
		this._contentElement.setAttribute('class', 'inboxsdk__menuContent');

		this._containerElement.appendChild(this._contentElement);

		blockAndReemiteKeyboardEvents(this._containerElement);
	}

	destroy() {
		this._containerElement.remove();
	}

	getContainerElement() {
		return this._containerElement;
	}

	getContentElement() {
		return this._contentElement;
	}
}
