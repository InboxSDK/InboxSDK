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
import outsideClicksAndEscape from '../../lib/dom/outsideClicksAndEscape';
import type {Options as ContainByScreenOptions} from 'contain-by-screen';

type Options = {
	manualPosition?: boolean;
	extraElementsToIgnore?: HTMLElement[];
};

// documented in src/docs/
class DropdownView extends EventEmitter {
	_dropdownViewDriver: Object;
	destroyed: boolean = false;
	/*deprecated*/closed: boolean = false;
	_options: Options;
	_userPlacementOptions: ContainByScreenOptions = {hAlign: 'left'};
	_scrollableContainByScreen: ?ScrollableContainByScreen = null;
	_didInsertContainerEl: boolean;
	el: HTMLElement;

	constructor(dropdownViewDriver: Object, anchorElement: HTMLElement, options: ?Options){
		super();

		this._dropdownViewDriver = dropdownViewDriver;
		this._options = {
			...(dropdownViewDriver.getDropdownOptions && dropdownViewDriver.getDropdownOptions()),
			...options
		};
		this.el = dropdownViewDriver.getContentElement();

		const containerEl = dropdownViewDriver.getContainerElement();
		if (document.contains(containerEl)) {
			this._didInsertContainerEl = false;
		} else {
			((document.body:any):HTMLElement).insertBefore(containerEl, ((document.body:any):HTMLElement).firstElementChild);
			this._didInsertContainerEl = true;
		}

		if(!containerEl.hasAttribute('tabindex')){
			// makes the element focusable, but not tab-focusable
			containerEl.setAttribute('tabindex', '-1');
		}

		const onDestroy = Kefir.fromEvents(this, 'destroy');

		const elementsToIgnore = [anchorElement, containerEl];
		if (this._options.extraElementsToIgnore) {
			elementsToIgnore.push(...this._options.extraElementsToIgnore);
		}

		outsideClicksAndEscape(elementsToIgnore)
			.takeUntilBy(onDestroy)
			.onValue(() => {
				this.close();
			});

		if(!this._options.manualPosition){
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

		const startActiveElement = document.activeElement;
		asap(() => {
			if (this.closed) return;
			if (document.activeElement !== startActiveElement) return;

			// Needs to happen after it's been positioned.
			containerEl.focus();
		});
	}

	setPlacementOptions(options: ContainByScreenOptions) {
		if (this._options.manualPosition) {
			console.error('DropdownView.setPlacementOptions() was called on a manually-positioned DropdownView.'); //eslint-disable-line no-console
			return;
		}
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
			if (this._didInsertContainerEl) {
				this._dropdownViewDriver.getContainerElement().remove();
			}
			this._dropdownViewDriver.destroy();
		}
	}
}

export default defn(module, DropdownView);
