var _ = require('lodash');


var _ = require('lodash');
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

		this._element.innerHTML = _getLabelHTML();
	},

	setLabelDescriptorProperty: function(labelDescriptorProperty){
		labelDescriptorProperty.onValue(this, '_handleNewLabelDescriptor');
	},

	_handleNewLabelDescriptor: function(labelDescriptor){
		if(!labelDescriptor){
			return;
		}

		this._updateIconClass(this._element.querySelector('.at'), false, labelDescriptor.iconClass);
		this._updateIconUrl(this._element.querySelector('.at'), false, labelDescriptor.iconUrl);
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
	},

	_updateForegroundColor: function(foregroundColor){
		if(this._labelDescriptor.foregroundColor === foregroundColor){
			return;
		}

		this._element.querySelector('.av').style.color = foregroundColor;

		var iconClassImg = this._element.querySelector('.inboxsdk__button_icon');
		if(iconClassImg){
			iconClassImg.setAttribute('style', `background-color: ${foregroundColor};`);
		}
	},

	_updateTitle: function(title){
		if(this._labelDescriptor.title === title){
			return;
		}

		this._element.querySelector('.av').textContent = title;
		this._element.children[0].setAttribute('data-tooltip', _.escape(title));
	},

	_updateIconClass: require('../lib/update-icon/update-icon-class'),
	_updateIconUrl: require('../lib/update-icon/update-icon-url')

});


function _getLabelHTML(){
	var backgroundColor = 'rgb(194, 194, 194)'; //grey
	var foregroundColor = 'rgb(255, 255, 255)'; //white

	return `<div class="ar as">
				<div class="at" style="background-color: ${backgroundColor}; border-color: ${backgroundColor}; color: ${foregroundColor};">
					<div class="av"></div>
				</div>
			</div>`;
}


module.exports = GmailLabelView;
