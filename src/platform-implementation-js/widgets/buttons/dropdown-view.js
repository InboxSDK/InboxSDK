var _ = require('lodash');
var asap = require('asap');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ud = require('ud');
var Kefir = require('kefir');

var kefirMakeMutationObserverChunkedStream = require('../../lib/dom/kefir-make-mutation-observer-chunked-stream');
var kefirFromEventTargetCapture = require('../../lib/kefir-from-event-target-capture');
var containByScreen2 = require('../../lib/dom/contain-by-screen2');

/**
 * @class
 * This class represents a Dropdown returned by the SDK to the app in various places.
 * The dropdown can be filled with your apps content, but it automatically handles dismissing
 * the dropdown on certain user actions.
 */
var DropdownView = function(dropdownViewDriver, anchorElement, options){
	EventEmitter.call(this);

	this._dropdownViewDriver = dropdownViewDriver;
	this._userPlacementOptions = {hAlign: 'left'};

	// type options: ?{manualPosition?: boolean}
	this._options = options || {};

	/**
	 * The HTML element that is displayed in the dropdown.
	 * @type {HTMLElement}
	 */
	this.el = dropdownViewDriver.getContentElement();
	this.closed = false;

	document.body.insertBefore(this._dropdownViewDriver.getContainerElement(), document.body.firstElementChild);

	if(!this._dropdownViewDriver.getContainerElement().hasAttribute('tabindex')){
		// makes the element focusable, but not tab-focusable
		this._dropdownViewDriver.getContainerElement().setAttribute('tabindex', '-1');
	}
	this._dropdownViewDriver.getContainerElement().focus();

	Kefir.merge([
			kefirFromEventTargetCapture(document, 'focus'),
			kefirFromEventTargetCapture(document, 'click')
		])
		.filter(event =>
			!anchorElement.contains(event.target) &&
				!this._dropdownViewDriver.getContainerElement().contains(event.target)
		)
		.takeUntilBy(Kefir.fromEvents(this, 'destroy'))
		.onValue(() => {
			this.close();
		});

	if(!this._options.manualPosition){
		this._dropdownViewDriver.getContainerElement().style.position = 'fixed';

		asap(() => {
			if (this.closed) return;
			var containerEl = dropdownViewDriver.getContainerElement();

			kefirMakeMutationObserverChunkedStream(dropdownViewDriver.getContentElement(), {
				childList: true, attributes: true,
				characterData: true, subtree: true
			})
				.merge(Kefir.fromEvents(this, '_placementOptionsUpdated'))
				.toProperty(()=>null)
				.throttle(200)
				.takeUntilBy(Kefir.fromEvents(this, 'destroy'))
				.onValue(event => {
					containByScreen2(containerEl, anchorElement, this._userPlacementOptions);
				});
		});
	}
};

util.inherits(DropdownView, EventEmitter);

_.assign(DropdownView.prototype, /** @lends DropdownView */ {

	// Takes options that containByScreen2 accepts
	setPlacementOptions: function(options) {
		Object.assign(this._userPlacementOptions, options);
		this.emit('_placementOptionsUpdated');
	},

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
