var _ = require('lodash');
var asap = require('asap');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ud = require('ud');
var Kefir = require('kefir');

var kefirMakeMutationObserverChunkedStream = require('../../lib/dom/kefir-make-mutation-observer-chunked-stream');
var kefirFromEventTargetCapture = require('../../lib/kefir-from-event-target-capture');
var containByScreen = require('../../lib/dom/contain-by-screen');

/**
 * @class
 * This class represents a Dropdown returned by the SDK to the app in various places.
 * The dropdown can be filled with your apps content, but it automatically handles dismissing
 * the dropdown on certain user actions.
 */
var DropdownView = function(dropdownViewDriver, anchorElement, placementOptions){
	EventEmitter.call(this);

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

	if(!this._dropdownViewDriver.getContainerElement().hasAttribute('tabindex')){
		// makes the element focusable, but not tab-focusable
		this._dropdownViewDriver.getContainerElement().setAttribute('tabindex', '-1');
	}
	this._dropdownViewDriver.getContainerElement().focus();

	Kefir.merge([
		kefirFromEventTargetCapture(document, 'focus'),
		kefirFromEventTargetCapture(document, 'click')
	]).filter(event =>
		!anchorElement.contains(event.target) &&
			!this._dropdownViewDriver.getContainerElement().contains(event.target)
	).takeUntilBy(Kefir.fromEvents(this, 'destroy'))
	.onValue(() => {
		this.close();
	});

	if(!placementOptions || !placementOptions.manualPosition){
		asap(() => {
			if (!this.closed) {
				var containerEl = dropdownViewDriver.getContainerElement();

				kefirMakeMutationObserverChunkedStream(dropdownViewDriver.getContentElement(), {
					childList: true, attributes: true,
					characterData: true, subtree: true
				})
					.toProperty(()=>null)
					.throttle(200)
					.takeUntilBy(Kefir.fromEvents(this, 'destroy'))
					.onValue(function(event) {
						containByScreen(containerEl, anchorElement, placementOptions);
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
			this.emit('destroy');
			this._dropdownViewDriver.destroy();
		}
	}

	/**
	 * Fires when this DropdownView instance is closed.
	 * @event DropdownView#destroy
	 */
});

DropdownView = ud.defn(module, DropdownView);

module.exports = DropdownView;
