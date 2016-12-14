/* @flow */

import {defn} from 'ud';
import isEqual from 'lodash/isEqual';
import updateIcon from '../lib/update-icon/update-icon';
import querySelector from '../../../lib/dom/querySelectorOrFail';

class GmailLabelView {
	_element: HTMLElement;
	_labelDescriptor: Object;
	_iconSettings: Object;

	constructor(opts={}) {
		this._element = document.createElement('div');
		this._element.className = 'inboxsdk__gmail_label ar as ' + (opts.classes || []).join(' ');
		this._element.innerHTML = `
			<div class="at">
				<div class="au">
					<div class="av"></div>
				</div>
			</div>`;

		this._labelDescriptor = {};
		this._iconSettings = {};
	}

	getElement(): HTMLElement {
		return this._element;
	}

	updateLabelDescriptor(labelDescriptor: ?Object) {
		this._handleNewLabelDescriptor(labelDescriptor);
	}

	_handleNewLabelDescriptor(labelDescriptor: ?Object){
		if(!labelDescriptor){
			this._labelDescriptor = {};
			return;
		}

		labelDescriptor = Object.assign({
			foregroundColor: 'rgb(102, 102, 102)', //dark grey
			backgroundColor: 'rgb(221, 221, 221)' //light grey
		}, labelDescriptor);

		if (isEqual(this._labelDescriptor, labelDescriptor)) {
			return;
		}

		updateIcon(
			this._iconSettings, querySelector(this._element, '.at'),
			false, labelDescriptor.iconClass, labelDescriptor.iconUrl);
		if (labelDescriptor.iconClass || labelDescriptor.iconUrl) {
			this._element.classList.add('inboxsdk__label_has_icon');
		} else {
			this._element.classList.remove('inboxsdk__label_has_icon');
		}
		this._updateBackgroundColor(labelDescriptor.backgroundColor);
		this._updateForegroundColor(labelDescriptor.foregroundColor);
		this._updateIconBackgroundColor(labelDescriptor.iconBackgroundColor);
		this._updateTitle(labelDescriptor.title);

		this._labelDescriptor = labelDescriptor;
	}

	_updateBackgroundColor(backgroundColor: string){
		if(this._labelDescriptor.backgroundColor === backgroundColor){
			return;
		}

		const elToChange = querySelector(this._element, '.at');
		elToChange.style.backgroundColor = backgroundColor;
		elToChange.style.borderColor = backgroundColor;

		querySelector(this._element, '.au').style.borderColor = backgroundColor;
	}

	_updateForegroundColor(foregroundColor: string){
		if(this._labelDescriptor.foregroundColor === foregroundColor){
			return;
		}

		querySelector(this._element, '.at').style.color = foregroundColor;
	}

	_updateIconBackgroundColor(iconBackgroundColor: ?string) {
		const icon = this.getElement().querySelector('.inboxsdk__button_icon');
		if (icon) {
			icon.style.backgroundColor = iconBackgroundColor || '';
		}
	}

	_updateTitle(title: string){
		if(this._labelDescriptor.title === title){
			return;
		}

		querySelector(this._element, '.av').textContent = title;
		this._element.children[0].setAttribute('data-tooltip', title);
	}
}

export default defn(module, GmailLabelView);
