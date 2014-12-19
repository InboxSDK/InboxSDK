var _ = require('lodash');
var asap = require('asap');
var EventEmitter = require('events').EventEmitter;

var fromEventTargetCapture = require('../../lib/from-event-target-capture');
var containByScreen = require('../../lib/dom/contain-by-screen');

var DropdownView = function(dropdownViewDriver, anchorElement, options){
	EventEmitter.call(this);

	var self = this;

	this._dropdownViewDriver = dropdownViewDriver;
	this.el = dropdownViewDriver.getContentElement();
	this.closed = false;

	this._dropdownViewDriver.getContainerElement().style.position = 'fixed';
	document.body.appendChild(this._dropdownViewDriver.getContainerElement());

	if(isNaN(this._dropdownViewDriver.getContainerElement().getAttribute('tabindex'))){
		this._dropdownViewDriver.getContainerElement().setAttribute('tabindex', -1);
	}

	this._focusUnsub = fromEventTargetCapture(document, 'focus').filter(function(event) {
		return !anchorElement.contains(event.target) &&
			!self._dropdownViewDriver.getContainerElement().contains(event.target);
	}).onValue(self, 'close');

	asap(function() {
		if (!self.closed) {
			containByScreen(dropdownViewDriver.getContainerElement(), anchorElement, options);
		}
	});
};

DropdownView.prototype = Object.create(EventEmitter.prototype);

_.extend(DropdownView.prototype, {

	close: function() {
		if (!this.closed) {
			this.closed = true;
			this.el = null;
			this._focusUnsub();
			this._dropdownViewDriver.destroy();
			this.emit('unload');
		}
	}

});

module.exports = DropdownView;
