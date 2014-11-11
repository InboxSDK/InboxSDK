var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../../lib/basic-class');
var simulateHover = require('../../../../lib/dom/simulate-hover');

var BUTTON_COLOR_CLASSES = require('./button-color-classes');

/*
 * options = {
 * 	hasButtonToLeft: true/false,
 * 	haseButtonToRight: true/false,
 * 	iconClass: string,
 * 	buttonColor: string [optional]
 * }
 */

var ButtonView = function(options){
	BasicClass.call(this);

	this._iconClass = options.iconClass;
	this._iconUrl = options.iconUrl;

	this._title = options.title;

	this._hasDropdown = options.hasDropdown;

	this._buttonColor = options.buttonColor || this._buttonColor;

	this._createElement(options);

	this._eventStream = new Bacon.Bus();
	this._setupEventStream();
	this._setupAestheticEvents();
};

ButtonView.prototype = Object.create(BasicClass.prototype);

_.extend(ButtonView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_innerElement', destroy: true},
		{name: '_textElement', destroy: true},
		{name: '_arrowElement', destroy: true},
		{name: '_iconElement', destroy: true},
		{name: '_iconImgElement', destroy: true},
		{name: '_iconClass', destroy: false},
		{name: '_iconUrl', destroy: false},
		{name: '_title', destroy: false},
		{name: '_hasDropdown', destroy: false, defaultValue: false},
		{name: '_buttonColor', destroy: false, defaultValue: 'default'},
		{name: '_eventStream', destroy: false, get: true}
	],

	activate: function(){
		this.addClass(BUTTON_COLOR_CLASSES[this._buttonColor].ACTIVE_CLASS);
		this.addClass(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
	},

	deactivate: function(){
		this.removeClass(BUTTON_COLOR_CLASSES[this._buttonColor].ACTIVE_CLASS);
		this.removeClass(BUTTON_COLOR_CLASSES[this._buttonColor].HOVER_CLASS);
	},

	addClass: function(className){
		this._element.classList.add(className);
	},

	removeClass: function(className){
		this._element.classList.remove(className);
	},

	simulateHover: function(){
		simulateHover(element);
	},

	update: function(options){
		if(options.buttonColor != this._buttonColor && this._buttonColor){
			this._updateButtonColor(options.buttonColor);
		}

		if(options.title != this._title){
			this._updateTitle(options.title);
		}

		if(options.iconUrl != this._iconUrl){
			this._updateIconUrl(options.iconUrl);
		}

		if(options.iconClass != this._iconClass){
			this._updateIconClass(options.iconClass);
		}
	},

	_createElement: function(options){
		this._createMainElement(options);

		this._createInnerElement(options);

		this._createTextElement(options);
		this._createIconElement(options);
	},

	_createMainElement: function(options){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'T-I J-J5-Ji ar7 L3 inboxsdk__button ' + BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS);

		if(options.hasButtonToRight){
			this._element.classList.add('T-I-Js-IF');
		}

		if (options.hasButtonToLeft) {
			this._element.classList.add('T-I-Js-Gs');
		}

		if(options.tooltip || options.title){
			this._element.setAttribute('data-tooltip',options.tooltip || options.title);
		}
	},

	_createInnerElement: function(options){
		this._innerElement = document.createElement('div');

		if(this._hasDropdown && !options.noArrow){
			this._innerElement.innerHTML = '<div class="G-asx T-I-J3 - J-J5-Ji">&nbsp;</div>';
		}

		this._element.appendChild(this._innerElement);
	},

	_createTextElement: function(){
		if(!this._title){
			return;
		}

		this._textElement = document.createElement('span');
		this._textElement.setAttribute('class', 'inboxsdk__button_text');
		this._textElement.textContent = this._title;

		if(this._iconElement){
			this._iconElement.insertAdjacentElement('afterend', this._textElement);
		}
		else{
			this._innerElement.insertBefore(this._textElement, this._innerElement.firstElementChild);
		}
	},

	_createIconElement: function(options){
		if(!this._iconClass && !this._iconUrl){
			return;
		}

		this._iconElement = document.createElement('div');
		this._iconElement.classList.add('inboxsdk__button_icon');
		this._iconElement.innerHTML = '&nbsp;';

		if(this._iconClass){
			this._iconElement.classList.add(this._iconClass);
		}

		if(this._iconUrl){
			this._createIconImgElement();
		}

		this._innerElement.insertBefore(this._iconElement, this._innerElement.firstElementChild);
	},

	_createIconImgElement: function(){
		this._iconElement.innerHTML = '';

		this._iconImgElement = document.createElement('img');
		this._iconImgElement.classList.add('inboxsdk__button_iconImg');

		this._iconImgElement.src = this._iconUrl;

		this._iconElement.appendChild(this._iconImgElement);
	},

	_updateButtonColor: function(newButtonColor){
		this._element.classList.remove(BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS);
		this._buttonColor = newButtonColor;

		this._element.classList.add(BUTTON_COLOR_CLASSES[this._buttonColor].INACTIVE_CLASS);
	},

	_updateTitle: function(newTitle){
		if(!this._title && newTitle){
			this._title = newTitle;
			this._createTextElement();
		}
		else if(this._title && !newTitle){
			this._textElement.remove();
			this._textElement = null;
			this._title = newTitle;
		}
		else{
			this._textElement.textContent = newTitle;
			this._title = newTitle;
		}
	},

	_updateIconUrl: function(newIconUrl){
		if(!this._iconUrl && newIconUrl){
			this._iconUrl = newIconUrl;
			this._createIconImgElement();
		}
		else if(this._iconUrl && !newIconUrl){
			this._iconImgElement.remove();
			this._iconImgElement = null;
			this._iconUrl = newIconUrl;
		}
		else{
			this._iconImgElement.src = newIconUrl;
			this._iconUrl = newIconUrl;
		}
	},

	_updateIconClass: function(newIconClass){
		if(!this._iconElement && newIconClass){
			this._createIconElement();
		}
		else if(this._iconClass && !newIconClass){
			if(!this._iconUrl){
				this._iconElement.remove();
				this._iconClass = newIconClass;
			}
			else{
				this._iconElement.classList.remove(this._iconClass);
				this._iconClass = newIconClass;
			}
		}
		else {
			this._iconElement.classList.remove(this._iconClass);
			this._iconElement.classList.add(newIconClass);

			this._iconClass = newIconClass;
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

				event.stopPropagation();
				event.preventDefault();
			}
		);

		this._element.addEventListener(
			'keydown',
			function(event){
				if(event.which === 32 /* space */ || event.which === 13 /* enter */){
					self._eventStream.push({
						eventName: 'click',
						domEvent: event
					});

					event.stopPropagation();
					event.preventDefault();
				}
			}
		);
	},

	_setupAestheticEvents: function(){
		var self = this;
		this._element.addEventListener(
			'mouseenter',
			function(){
				self._element.classList.add(BUTTON_COLOR_CLASSES[self._buttonColor].HOVER_CLASS);
				self._element.classList.add('inboxsdk__button_hover');
			}
		);

		this._element.addEventListener(
			'mouseleave',
			function(){
				self._element.classList.remove(BUTTON_COLOR_CLASSES[self._buttonColor].HOVER_CLASS);
				self._element.classList.remove('inboxsdk__button_hover');
			}
		);
	}

});

module.exports = ButtonView;

