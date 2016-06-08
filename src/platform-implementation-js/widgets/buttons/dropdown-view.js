/* @flow */

import _ from 'lodash';
import asap from 'asap';
import util from 'util';
import EventEmitter from '../../lib/safe-event-emitter';
import {defn} from 'ud';
import Kefir from 'kefir';

import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import fromEventTargetCapture from '../../lib/from-event-target-capture';
import containByScreen from 'contain-by-screen';
import type {Options as ContainByScreenOptions} from 'contain-by-screen';

type Options = {
	manualPosition?: boolean;
};

// documented in src/docs/
class DropdownView extends EventEmitter {
	_dropdownViewDriver: Object;
	destroyed: boolean = false;
	/*deprecated*/closed: boolean = false;
	_options: Options;
	_userPlacementOptions: ContainByScreenOptions = {hAlign: 'left'};
	el: HTMLElement;

	constructor(dropdownViewDriver: Object, anchorElement: HTMLElement, options: ?Options){
		super();

		this._dropdownViewDriver = dropdownViewDriver;
		this._options = options || {};
		this.el = dropdownViewDriver.getContentElement();

		document.body.insertBefore(this._dropdownViewDriver.getContainerElement(), document.body.firstElementChild);

		if(!this._dropdownViewDriver.getContainerElement().hasAttribute('tabindex')){
			// makes the element focusable, but not tab-focusable
			this._dropdownViewDriver.getContainerElement().setAttribute('tabindex', '-1');
		}
		this._dropdownViewDriver.getContainerElement().focus();

		Kefir.merge([
				fromEventTargetCapture(document, 'focus'),
				fromEventTargetCapture(document, 'click')
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

				makeMutationObserverChunkedStream(dropdownViewDriver.getContentElement(), {
					childList: true, attributes: true,
					characterData: true, subtree: true
				})
					.merge(Kefir.fromEvents(this, '_placementOptionsUpdated'))
					.toProperty(()=>null)
					.throttle(200)
					.takeUntilBy(Kefir.fromEvents(this, 'destroy'))
					.onValue(event => {
						containByScreen(containerEl, anchorElement, this._userPlacementOptions);
					});
			});
		}
	}

	setPlacementOptions(options: ContainByScreenOptions) {
		Object.assign(this._userPlacementOptions, options);
		this.emit('_placementOptionsUpdated');
	}

	close() {
		if (!this.destroyed) {
			this.destroyed = this.closed = true;
			this.emit('destroy');
			this._dropdownViewDriver.destroy();
		}
	}
}

export default defn(module, DropdownView);
