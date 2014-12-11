var _ = require('lodash');
var BasicClass = require('../../../lib/basic-class');

var DropdownView = function(){
	BasicClass.call(this);

	this._setupElement();
};

DropdownView.prototype = Object.create(BasicClass.prototype);

_.extend(DropdownView.prototype, {

	__memberVariables: [
		{name: '_containerElement', destroy: true, get: true},
		{name: '_contentElement', destroy: true, get: true}
	],

	_setupElement: function(){
		this._containerElement = document.createElement('div');
		this._containerElement.setAttribute('class', 'J-M uEPqDe inboxsdk__menu');

		this._contentElement = document.createElement('div');
		this._contentElement.setAttribute('class', 'SK AX');

		this._containerElement.appendChild(this._contentElement);
	},

	empty: function(){
		this._contentElement.innerHTML = '';
	},

	focus: function(){
		this._containerElement.focus();
	}
});

module.exports = DropdownView;
