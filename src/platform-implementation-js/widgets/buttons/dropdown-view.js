var _ = require('lodash');
var asap = require('asap');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ud = require('ud');
var Kefir = require('kefir');

var kefirMakeMutationObserverChunkedStream = require('../../lib/dom/kefir-make-mutation-observer-chunked-stream');
var kefirFromEventTargetCapture = require('../../lib/kefir-from-event-target-capture');
var containByScreen2 = require('contain-by-screen');

// documented in src/docs/
var DropdownView = function(dropdownViewDriver, anchorElement, options){
	EventEmitter.call(this);

	this._dropdownViewDriver = dropdownViewDriver;
	this._userPlacementOptions = {hAlign: 'left'};

	// type options: ?{manualPosition?: boolean}
	this._options = options || {};

	this.el = dropdownViewDriver.getContentElement();
	this.destroyed = this.closed/*deprecated*/ = false;

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
			event.isTrusted &&
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

_.assign(DropdownView.prototype, {

	setPlacementOptions(options) {
		Object.assign(this._userPlacementOptions, options);
		this.emit('_placementOptionsUpdated');
	},

	close() {
		if (!this.destroyed) {
			this.destroyed = this.closed = true;
			this.emit('destroy');
			this._dropdownViewDriver.destroy();
		}
	}
});

DropdownView = ud.defn(module, DropdownView);

module.exports = DropdownView;
