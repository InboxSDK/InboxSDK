var _ = require('lodash');
var updateIcon = require('../lib/update-icon/update-icon');
var BasicClass = require('../../../lib/basic-class');

var GmailLabelView = function(){
	BasicClass.call(this);

	this._setupElement();
};

GmailLabelView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailLabelView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_labelDescriptor', destroy: false, defaultValue: {}},
		{name: '_iconClass', destroy: false},
		{name: '_iconUrl', destroy: false}
	],

	_setupElement: function(){
		this._element = document.createElement('div');
		this._element.className = 'inboxsdk__gmail_label ar as';

		this._element.innerHTML = `
			<div class="at">
				<div class="au">
					<div class="av"></div>
				</div>
			</div>`;
	},

	setLabelDescriptorProperty: function(labelDescriptorProperty){
		labelDescriptorProperty.onValue(this, '_handleNewLabelDescriptor');
	},

	_handleNewLabelDescriptor: function(labelDescriptor){
		if(!labelDescriptor){
			return;
		}

		labelDescriptor = _.extend({
			foregroundColor: 'rgb(102, 102, 102)', //dark grey
			backgroundColor: 'rgb(221, 221, 221)' //light grey
		}, labelDescriptor);

		updateIcon(
			this, this._element.querySelector('.at'),
			false, labelDescriptor.iconClass, labelDescriptor.iconUrl);
		if (labelDescriptor.iconClass || labelDescriptor.iconUrl) {
			this._element.classList.add('inboxsdk__label_has_icon');
		} else {
			this._element.classList.remove('inboxsdk__label_has_icon');
		}
		this._updateBackgroundColor(labelDescriptor.backgroundColor);
		this._updateForegroundColor(labelDescriptor.foregroundColor);
		this._updateTitle(labelDescriptor.title);

		this._labelDescriptor = labelDescriptor;
	},

	_updateBackgroundColor: function(backgroundColor){
		if(this._labelDescriptor.backgroundColor === backgroundColor){
			return;
		}

		var elToChange = this._element.querySelector('.at');
		elToChange.style.backgroundColor = backgroundColor;
		elToChange.style.borderColor = backgroundColor;

		this._element.querySelector('.au').style.borderColor = backgroundColor;
	},

	_updateForegroundColor: function(foregroundColor){
		if(this._labelDescriptor.foregroundColor === foregroundColor){
			return;
		}

		this._element.querySelector('.at').style.color = foregroundColor;

		var iconClassImg = this._element.querySelector('.inboxsdk__button_icon');
		if(iconClassImg){
			iconClassImg.style.backgroundColor = foregroundColor;
		}
	},

	_updateTitle: function(title){
		if(this._labelDescriptor.title === title){
			return;
		}

		this._element.querySelector('.av').textContent = title;
		this._element.children[0].setAttribute('data-tooltip', title);
	}
});

module.exports = GmailLabelView;
