/* @flow */

import {defn} from 'ud';
import type Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type ButtonView from '../../dom-driver/gmail/widgets/buttons/button-view.js';
import DropdownView from './dropdown-view';

class DropdownButtonViewController {
	_view: ?ButtonView;
	_dropdownShowFunction: ?Function;
	_dropdownView: ?DropdownView;
	_DropdownViewDriverClass: Class<any>;
	_dropdownPositionOptions: Object;
	_stopper = kefirStopper();

	constructor(options: Object){
		this._dropdownShowFunction = options.dropdownShowFunction;
		this._DropdownViewDriverClass = options.dropdownViewDriverClass;

		const view = this._view = options.buttonView;
		this._dropdownPositionOptions = options.dropdownPositionOptions;

		view.getElement().setAttribute('aria-haspopup', 'true');
		view.getElement().setAttribute('aria-pressed', 'false');
		view.getElement().setAttribute('aria-expanded', 'false');

		this._bindToViewEvents();
	}

	getStopper(): Kefir.Observable<null> {
		return this._stopper;
	}

	destroy() {
		if (this._view) {
			this._view.destroy();
			this._view = null;
		}
		if (this._dropdownView) {
			this._dropdownView.close();
			this._dropdownView = null;
		}
		this._stopper.destroy();
	}

	getView(): ButtonView {
		if (!this._view) throw new Error("Already destroyed");
		return this._view;
	}

	setDropdownShowFunction(func: ?Function) {
		this._dropdownShowFunction = func;
	}

	showDropdown() {
		this.hideDropdown();
		const view = this._view;
		if (!view) throw new Error("Already destroyed");
		view.activate();

		const dropdownView = this._dropdownView = new DropdownView(new this._DropdownViewDriverClass(), view.getElement(), null);
		if (this._dropdownPositionOptions) {
			dropdownView.setPlacementOptions(this._dropdownPositionOptions);
		}

		dropdownView.on('destroy', this._dropdownClosed.bind(this));

		if(this._dropdownShowFunction){
			this._dropdownShowFunction({dropdown: this._dropdownView});
		}

		view.getElement().setAttribute('aria-pressed', 'true');
		view.getElement().setAttribute('aria-expanded', 'true');
	}

	hideDropdown() {
		if(this._dropdownView){
			this._dropdownView.close();
		}
	}

	isDropdownVisible(): boolean {
		return !!this._dropdownView;
	}

	_bindToViewEvents() {
		if (!this._view) throw new Error("Already destroyed");
		this._view
			.getEventStream()
			.filter(event => event.eventName === 'click')
			.onValue(() => {this._toggleDropdownState();});
	}

	_toggleDropdownState() {
		if(this._dropdownView){
			this._dropdownView.close();
		}
		else{
			this.showDropdown();
		}
	}

	_dropdownClosed() {
		const view = this._view;
		if (view) {
			view.deactivate();
			this._dropdownView = null;

			view.getElement().setAttribute('aria-pressed', 'false');
			view.getElement().setAttribute('aria-expanded', 'false');
		}
	}
}

export default defn(module, DropdownButtonViewController);
