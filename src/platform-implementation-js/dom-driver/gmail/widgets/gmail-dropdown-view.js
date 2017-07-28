/* eslint-disable flowtype/require-valid-file-annotation */

import BasicClass from '../../../lib/basic-class';

export default function GmailDropdownView() {
	BasicClass.call(this);

	this._setupElement();
}

GmailDropdownView.prototype = Object.create(BasicClass.prototype);

Object.assign(GmailDropdownView.prototype, {

	__memberVariables: [
		{name: '_containerElement', destroy: true, get: true},
		{name: '_contentElement', destroy: true, get: true}
	],

	_setupElement: function(){
		this._containerElement = document.createElement('div');
		this._containerElement.setAttribute('class', 'inboxsdk__menu');

		this._contentElement = document.createElement('div');
		this._contentElement.setAttribute('class', 'inboxsdk__menuContent');

		this._containerElement.appendChild(this._contentElement);
	}
});
