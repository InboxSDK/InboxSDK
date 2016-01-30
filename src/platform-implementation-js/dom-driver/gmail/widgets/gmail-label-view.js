/* @flow */

import {defn} from 'ud';
import once from 'lodash/function/once';
import isEqual from 'lodash/lang/isEqual';
import updateIcon from '../lib/update-icon/update-icon';

class GmailLabelView {
	getElement: () => HTMLElement;
	_labelDescriptor: Object;
	_iconSettings: Object;

	constructor(opts={}) {
		this.getElement = once(() => {
			const element = document.createElement('div');
			element.className = 'inboxsdk__gmail_label ar as ' + (opts.classes || []).join(' ');
			element.innerHTML = `
				<div class="at">
					<div class="au">
						<div class="av"></div>
					</div>
				</div>`;
			return element;
		});
		this._labelDescriptor = {};
		this._iconSettings = {};
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

		const element = this.getElement();

		updateIcon(
			this._iconSettings, element.querySelector('.at'),
			false, labelDescriptor.iconClass, labelDescriptor.iconUrl);
		if (labelDescriptor.iconClass || labelDescriptor.iconUrl) {
			element.classList.add('inboxsdk__label_has_icon');
		} else {
			element.classList.remove('inboxsdk__label_has_icon');
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
		const element = this.getElement();

		var elToChange = element.querySelector('.at');
		elToChange.style.backgroundColor = backgroundColor;
		elToChange.style.borderColor = backgroundColor;

		element.querySelector('.au').style.borderColor = backgroundColor;
	}

	_updateForegroundColor(foregroundColor: string){
		if(this._labelDescriptor.foregroundColor === foregroundColor){
			return;
		}
		const element = this.getElement();

		element.querySelector('.at').style.color = foregroundColor;
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
		const element = this.getElement();

		element.querySelector('.av').textContent = title;
		element.children[0].setAttribute('data-tooltip', title);
	}
}
GmailLabelView = defn(module, GmailLabelView);

export default GmailLabelView;
