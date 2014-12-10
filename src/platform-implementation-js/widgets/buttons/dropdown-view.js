var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var containByScreen = require('../../lib/dom/contain-by-screen');

var DropdownView = function(dropdownViewDriver, anchorElement){
	EventEmitter.call(this);

	this._dropdownViewDriver = dropdownViewDriver;
	this._anchorElement = anchorElement;
	this.el = dropdownViewDriver.getContentElement();


	this._dropdownViewDriver.empty();
	this._dropdownViewDriver.getContainerElement().style.position = 'fixed';
	document.body.appendChild(this._dropdownViewDriver.getContainerElement());

	if(isNaN(this._dropdownViewDriver.getContainerElement().getAttribute('tabindex'))){
		this._dropdownViewDriver.getContainerElement().setAttribute('tabindex', -1);
	}

	this._startMonitoringFocusEvents();
};

DropdownView.prototype = Object.create(EventEmitter.prototype);

_.extend(DropdownView.prototype, {

	close: function(){
		this.emit('close');
	},

	focus: function(){
		this._dropdownViewDriver.focus();
	},

	containByScreen: function(anchorElement, positionOptions){
		containByScreen(this._dropdownViewDriver.getContainerElement(), anchorElement, positionOptions);
	},

	_startMonitoringFocusEvents: function(){
		var self = this;

		this._focusFunction = function(event){
			var focusedElement = event.target;

			var checkElement = focusedElement;
			for(var ii=0; ii<100; ii++){
				if(checkElement === null){
					self.close();
					return;
				}

				if(checkElement === self._dropdownViewDriver.getContainerElement() || checkElement === self._anchorElement){
					return;
				}

				checkElement = checkElement.parentElement;
			}
		};

		document.addEventListener(
			'focus',
			this._focusFunction,
			true
		);
	},

	_stopMonitoringFocusEvents: function(){
		document.removeEventListener('focus', this._focusFunction, true);
	},

	destroy: function(){
		this._dropdownViewDriver.destroy();
		this.removeAllListeners();
		this._stopMonitoringFocusEvents();

		this.el = null;
	}

});

module.exports = DropdownView;
