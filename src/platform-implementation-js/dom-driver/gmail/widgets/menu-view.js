var _ = require('lodash');
var BasicClass = require('../../../lib/basic-class');

var MenuView = function(){
	BasicClass.call(this);

	this._setupElement();
};

MenuView.prototype = Object.create(BasicClass.prototype);

_.extend(MenuView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_contentElement', destroy: true, get: true}
	],

	_setupElement: function(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'J-M uEPqDe inboxsdk__menu');

		this._contentElement = document.createElement('div');
		this._contentElement.setAttribute('class', 'SK AX');

		this._element.appendChild(this._contentElement);
	}
});

module.exports = MenuView;
