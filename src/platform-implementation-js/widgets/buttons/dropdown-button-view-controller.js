/* @flow */

import _ from 'lodash';
import {defn} from 'ud';

import type ButtonView from '../../dom-driver/gmail/widgets/buttons/button-view.js';
import DropdownView from './dropdown-view';

class DropdownButtonViewController {
	_view: ButtonView;
	_dropdownShowFunction: ?Function;
	_dropdownView: ?DropdownView;
	_DropdownViewDriverClass: Class<any>;
	_dropdownPositionOptions: Object;

	constructor(options: Object){
		this._dropdownShowFunction = options.dropdownShowFunction;
		this._DropdownViewDriverClass = options.dropdownViewDriverClass;

		this._view = options.buttonView;
		this._dropdownPositionOptions = options.dropdownPositionOptions;

		this._view.getElement().setAttribute('aria-haspopup', 'true');
		this._view.getElement().setAttribute('aria-pressed', 'false');
		this._view.getElement().setAttribute('aria-expanded', 'false');

		this._bindToViewEvents();
	}

	destroy() {
		this._view.destroy();
		if (this._dropdownView) {
			this._dropdownView.close();
			this._dropdownView = null;
		}
	}

	getView(): ButtonView {
		return this._view;
	}

	setDropdownShowFunction(func: ?Function) {
		this._dropdownShowFunction = func;
	}

	showDropdown() {
		this._view.activate();
		const dropdownView = this._dropdownView = new DropdownView(new this._DropdownViewDriverClass(), this._view.getElement(), null);
		if (this._dropdownPositionOptions) {
			dropdownView.setPlacementOptions(this._dropdownPositionOptions);
		}

		dropdownView.on('destroy', this._dropdownClosed.bind(this));

		if(this._dropdownShowFunction){
			this._dropdownShowFunction({dropdown: this._dropdownView});
		}

		this._view.getElement().setAttribute('aria-pressed', 'true');
		this._view.getElement().setAttribute('aria-expanded', 'true');
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
		if(this._view){
			this._view.deactivate();
		}
		this._dropdownView = null;

		this._view.getElement().setAttribute('aria-pressed', 'false');
		this._view.getElement().setAttribute('aria-expanded', 'false');
	}
}

export default defn(module, DropdownButtonViewController);
