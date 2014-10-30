var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../../lib/basic-class');


/*
 * options = {
 * 	hasButtonToLeft: true/false,
 * 	haseButtonToRight: true/false,
 * 	iconClass: string,
 * 	buttonColor: string [optional]
 * }
 */

var IconButtonView = function(options){
	BasicClass.call(this);

	this._iconClass = options.iconClass;
	this._iconUrl = options.iconUrl;

	this._buttonColor = options.buttonColor || this._buttonColor;

	this._createElement(options);

	this._eventStream = new Bacon.Bus();
	this._setupEventStream();
	this._setupAestheticEvents();
};

IconButtonView.prototype = Object.create(BasicClass.prototype);

_.extend(IconButtonView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_innerElement', destroy: true},
		{name: '_iconElement', destroy: true},
		{name: '_iconImgElement', destroy: true},
		{name: '_iconClass', destroy: false},
		{name: '_buttonColor', destroy: false, defaultValue: 'default'},
		{name: '_eventStream', destroy: false, get: true}
	],

	addClass: function(className){
		this._element.classList.add(className);
	},

	_createElement: function(options){
		this._element = document.createElement('div');
		this._innerElement = document.createElement('div');
		this._iconElement = document.createElement('div');

		this._iconElement.innerHTML = '&nbsp;';
		this._element.appendChild(this._innerElement);
		this._innerElement.appendChild(this._iconElement);

		this._element.setAttribute('class', 'T-I J-J5-Ji ar7 L3 J-Zh-I G-Ni gmailsdk__button ' + this.colorClasses[this._buttonColor].INACTIVE_CLASS);

		if(options.hasButtonToRight){
			this._element.classList.add('T-I-Js-IF');
		}

		if (options.hasButtonToLeft) {
			this._element.classList.add('T-I-Js-Gs');
		}

		if(options.tooltip){
			this._element.setAttribute('data-tooltip',options.tooltip);
		}

		this._iconElement.setAttribute('class', this._iconClass);

		if(this._iconUrl){
			this._iconImgElement = document.createElement('img');
			this._iconImgElement.src = this._iconUrl;

			this._iconElement.appendChild(this._iconImgElement);
		}
	},

	_setupEventStream: function(){
		var self = this;

		this._element.addEventListener(
			'click',
			function(event){
				self._eventStream.push({
					eventName: 'click',
					domEvent: event
				});
			}
		);
	},

	_setupAestheticEvents: function(){
		var self = this;
		this._element.addEventListener(
			'mouseenter',
			function(){
				self._element.classList.add(self.colorClasses[self._buttonColor].HOVER_CLASS);
			}
		);

		this._element.addEventListener(
			'mouseleave',
			function(){
				self._element.classList.remove(self.colorClasses[self._buttonColor].HOVER_CLASS);
			}
		);
	},

	colorClasses: {
		"default": {
			INACTIVE_CLASS: 'T-I-ax7',
			HOVER_CLASS: 'T-I-JW',
			ACTIVE_CLASS: 'T-I-Kq'
		},

		flatIcon: {
			INACTIVE_CLASS: 'J-Z-I',
			HOVER_CLASS: 'J-Z-I-JW',
			ACTIVE_CLASS: 'J-Z-I-KO'
		}
	}

});

module.exports = IconButtonView;

