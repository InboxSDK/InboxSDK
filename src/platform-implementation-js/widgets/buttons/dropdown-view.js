/* @flow */

import _ from 'lodash';
import asap from 'asap';
import util from 'util';
import EventEmitter from '../../lib/safe-event-emitter';
import {defn} from 'ud';
import Kefir from 'kefir';

import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import fromEventTargetCapture from '../../lib/from-event-target-capture';
import ScrollableContainByScreen from '../../lib/ScrollableContainByScreen';
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
	_scrollableContainByScreen: ?ScrollableContainByScreen = null;
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

		const onDestroy = Kefir.fromEvents(this, 'destroy');

		Kefir.merge([
				fromEventTargetCapture(document, 'focus'),
				fromEventTargetCapture(document, 'click')
			])
			.filter(event =>
				event.isTrusted &&
				!anchorElement.contains(event.target) &&
				!this._dropdownViewDriver.getContainerElement().contains(event.target)
			)
			.takeUntilBy(onDestroy)
			.onValue(() => {
				this.close();
			});

		if(!this._options.manualPosition){
			const containerEl = dropdownViewDriver.getContainerElement();
			containerEl.style.position = 'fixed';

			asap(() => {
				if (this.closed) return;

				Kefir.fromEvents(this, '_placementOptionsUpdated')
					.toProperty(() => null)
					.takeUntilBy(onDestroy)
					.onValue(() => {
						if (this._scrollableContainByScreen) {
							this._scrollableContainByScreen.destroy();
						}
						this._scrollableContainByScreen = new ScrollableContainByScreen(
							containerEl, anchorElement, this._userPlacementOptions
						);
					});

				makeMutationObserverChunkedStream(dropdownViewDriver.getContentElement(), {
					childList: true, attributes: true,
					characterData: true, subtree: true
				})
					.throttle(200)
					.takeUntilBy(onDestroy)
					.onValue(event => {
						if (this._scrollableContainByScreen) {
							this._scrollableContainByScreen.reposition();
						}
					});
			});
		}
	}

	setPlacementOptions(options: ContainByScreenOptions) {
		this._userPlacementOptions = {...this._userPlacementOptions, ...options};
		this.emit('_placementOptionsUpdated');
	}

	close() {
		if (!this.destroyed) {
			this.destroyed = this.closed = true;
			if (this._scrollableContainByScreen) {
				this._scrollableContainByScreen.destroy();
			}
			this.emit('destroy');
			this._dropdownViewDriver.destroy();
		}
	}
}

export default defn(module, DropdownView);
