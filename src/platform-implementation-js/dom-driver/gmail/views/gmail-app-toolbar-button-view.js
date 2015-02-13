'use strict';

var asap = require('asap');
var _ = require('lodash');
var Bacon = require('baconjs');
var baconCast = require('bacon-cast');


var BasicClass = require('../../../lib/basic-class');


var updateIcon = require('../lib/update-icon/update-icon');

var GmailElementGetter = require('../gmail-element-getter');
var GmailTooltipView = require('../widgets/gmail-tooltip-view');

var DropdownView = require('../../../widgets/buttons/dropdown-view');


var GmailAppToolbarButtonView = function(inButtonDescriptor){
	BasicClass.call(this);

	var buttonDescriptorProperty = baconCast(Bacon, inButtonDescriptor);
	buttonDescriptorProperty.onValue((buttonDescriptor) => this._handleButtonDescriptor(buttonDescriptor));
};

GmailAppToolbarButtonView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailAppToolbarButtonView.prototype, {

	__memberVariables: [
		{name: '_buttonDescriptorProperty', destroy: false},
		{name: '_buttonDescriptor', destroy: false},
		{name: '_element', destroy: true, get: true},
		{name: '_activeDropdown', destroy: true}
	],

	open: function(){
		if(!this._activeDropdown){
			this._handleClick();
		}
	},

	_handleButtonDescriptor: function(buttonDescriptor){
		if(!this._element && buttonDescriptor){
			this._element = _createAppButtonElement();
		}

		this._buttonDescriptor = buttonDescriptor;

		var iconSettings = {};
		var currentTitle = null;

		updateIcon(iconSettings, this._element.querySelector('a'), false, buttonDescriptor.iconClass, buttonDescriptor.iconUrl);
		_updateTitle(this._element.querySelector('span'), currentTitle, buttonDescriptor.title);
		currentTitle = buttonDescriptor.title;

		this._element.onclick = (event) => {
			event.preventDefault();

			this._handleClick();
		};
	},

	_handleClick: function(){
		if(this._activeDropdown){
			this._activeDropdown.close();
			this._activeDropdown = null;
		}
		else{
			var appEvent = {};
			var tooltipView = new GmailTooltipView();
			tooltipView.getContainerElement().classList.add('inboxsdk__appButton_tooltip');
			tooltipView.getContentElement().innerHTML = '';

			if(this._buttonDescriptor.arrowColor){
				tooltipView.getContainerElement().querySelector('.T-P-atC').style.borderTopColor = this._buttonDescriptor.arrowColor;
			}

			appEvent.dropdown = this._activeDropdown = new DropdownView(tooltipView, this._element, {manualPosition: true});
			appEvent.dropdown.on('destroy', function(){
              setTimeout(() => {
                this._activeDropdown = null;
              }, 1);
            });

            if(this._buttonDescriptor.onClick){
            	this._buttonDescriptor.onClick(appEvent);
            }

            asap(() => {
            	tooltipView.anchor(
            		this._element,
            		{
            			position: 'bottom',
            			offset: {
            				top: 8
            			}
            		}
            	);
            });

		}
	}

});

function _createAppButtonElement(){

	var element = document.createElement('div');
	element.setAttribute('class', 'inboxsdk__appButton');

	element.innerHTML = `<a href="#">
							 <span class="inboxsdk__appButton_title"></span>
						 </a>`;



	var topAccountContainer = GmailElementGetter.getTopAccountContainer();
	if(!topAccountContainer){
		return;
	}

	var insertionElement = topAccountContainer.children[0];
	if(!insertionElement){
		return;
	}

	if(!GmailElementGetter.isGplusEnabled()){
		element.classList.add('inboxsdk__appButton_noGPlus');
	}

	insertionElement.insertBefore(element, insertionElement.firstElementChild);

	return element;

}

function _updateTitle(element, currentTitle, newTitle){
	if(currentTitle === newTitle){
		return;
	}

	element.textContent = newTitle;
}

module.exports = GmailAppToolbarButtonView;
