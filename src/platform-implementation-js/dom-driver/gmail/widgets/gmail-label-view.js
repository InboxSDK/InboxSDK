var _ = require('lodash');
var updateIcon = require('../lib/update-icon/update-icon');

class GmailLabelView {
	constructor(opts={}) {
		this.getElement = _.once(() => {
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
		this.iconClass = null;
		this.iconUrl = null;
	}

	setLabelDescriptorProperty(labelDescriptorProperty){
		labelDescriptorProperty.onValue(this, '_handleNewLabelDescriptor');
	}

	_handleNewLabelDescriptor(labelDescriptor){
		if(!labelDescriptor){
			return;
		}

		labelDescriptor = _.extend({
			foregroundColor: 'rgb(102, 102, 102)', //dark grey
			backgroundColor: 'rgb(221, 221, 221)' //light grey
		}, labelDescriptor);

		if (_.isEqual(this._labelDescriptor, labelDescriptor)) {
			return;
		}

		const element = this.getElement();

		updateIcon(
			this, element.querySelector('.at'),
			false, labelDescriptor.iconClass, labelDescriptor.iconUrl);
		if (labelDescriptor.iconClass || labelDescriptor.iconUrl) {
			element.classList.add('inboxsdk__label_has_icon');
		} else {
			element.classList.remove('inboxsdk__label_has_icon');
		}
		this._updateBackgroundColor(labelDescriptor.backgroundColor);
		this._updateForegroundColor(labelDescriptor.foregroundColor);
		this._updateTitle(labelDescriptor.title);

		this._labelDescriptor = labelDescriptor;
	}

	_updateBackgroundColor(backgroundColor){
		if(this._labelDescriptor.backgroundColor === backgroundColor){
			return;
		}
		const element = this.getElement();

		var elToChange = element.querySelector('.at');
		elToChange.style.backgroundColor = backgroundColor;
		elToChange.style.borderColor = backgroundColor;

		element.querySelector('.au').style.borderColor = backgroundColor;
	}

	_updateForegroundColor(foregroundColor){
		if(this._labelDescriptor.foregroundColor === foregroundColor){
			return;
		}
		const element = this.getElement();

		element.querySelector('.at').style.color = foregroundColor;

		var iconClassImg = element.querySelector('.inboxsdk__button_icon');
		if(iconClassImg){
			iconClassImg.style.backgroundColor = foregroundColor;
		}
	}

	_updateTitle(title){
		if(this._labelDescriptor.title === title){
			return;
		}
		const element = this.getElement();

		element.querySelector('.av').textContent = title;
		element.children[0].setAttribute('data-tooltip', title);
	}
}

module.exports = GmailLabelView;
