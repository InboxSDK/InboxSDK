var _ = require('lodash');
var asap = require('asap');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Bacon = require('baconjs');
var Kefir = require('kefir');

var kefirMakeMutationObserverChunkedStream = require('../../lib/dom/kefir-make-mutation-observer-chunked-stream');
var fromEventTargetCapture = require('../../lib/from-event-target-capture');
var containByScreen = require('../../lib/dom/contain-by-screen');

/**
 * @class
 * This class represents a Dropdown returned by the SDK to the app in various places.
 * The dropdown can be filled with your apps content, but it automatically handles dismissing
 * the dropdown on certain user actions.
 */
var DropdownView = function(dropdownViewDriver, anchorElement, placementOptions){
	EventEmitter.call(this);

	var self = this;

	this._dropdownViewDriver = dropdownViewDriver;

	/**
	 * The HTML element that is displayed in the dropdown.
	 * @type {HTMLElement}
	 */
	this.el = dropdownViewDriver.getContentElement();
	this.closed = false;

	if(!placementOptions || !placementOptions.manualPosition){
		this._dropdownViewDriver.getContainerElement().style.position = 'fixed';
	}

	document.body.insertBefore(this._dropdownViewDriver.getContainerElement(), document.body.firstElementChild);

	if(this._dropdownViewDriver.getContainerElement().getAttribute('tabindex') == null){
		this._dropdownViewDriver.getContainerElement().setAttribute('tabindex', -1);
	}
	this._dropdownViewDriver.getContainerElement().focus();

	this._focusUnsub = Bacon.mergeAll(
		fromEventTargetCapture(document, 'focus'),
		fromEventTargetCapture(document, 'click')
	).filter(function(event) {
		return !anchorElement.contains(event.target) &&
			!self._dropdownViewDriver.getContainerElement().contains(event.target);
	}).onValue(self, 'close');

	if(!placementOptions || !placementOptions.manualPosition){
		asap(function() {
			if (!self.closed) {
				var contentEl = dropdownViewDriver.getContainerElement();
				containByScreen(contentEl, anchorElement, placementOptions);

				kefirMakeMutationObserverChunkedStream(contentEl, {
					childList: true, attributes: true,
					characterData: true, subtree: true
				})
					.throttle(200)
					.takeUntilBy(Kefir.fromEvents(self, 'destroy'))
					.onValue(function() {
						containByScreen(contentEl, anchorElement, placementOptions);
					});
			}
		});
	}
};

util.inherits(DropdownView, EventEmitter);

_.assign(DropdownView.prototype, /** @lends DropdownView */ {

	/**
	 * Closes the dropdown
	 * @return {void}
	 */
	close: function() {
		if (!this.closed) {
			this.closed = true;
			this._focusUnsub();
			this._dropdownViewDriver.destroy();
			this.emit('destroy');
		}
	}

	/**
	 * Fires when this DropdownView instance is closed.
	 * @event DropdownView#destroy
	 */
});

module.exports = DropdownView;
