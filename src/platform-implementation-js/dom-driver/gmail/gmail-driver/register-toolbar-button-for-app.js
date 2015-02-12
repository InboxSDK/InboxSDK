'use strict';

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');
var asap = require('asap');

var updateIcon = require('../lib/update-icon/update-icon');

var GmailElementGetter = require('../gmail-element-getter');
var GmailTooltipView = require('../widgets/gmail-tooltip-view');

var DropdownView = require('../../../widgets/buttons/dropdown-view');

module.exports = function(gmailDriver, inButtonDescriptor){
	var buttonDescriptorProperty = baconCast(Bacon, inButtonDescriptor);

	var element = null;
	var currentTitle = {};
	var iconSettings = {};

	var activeDropdown = null;

	GmailElementGetter.waitForGmailModeToSettle().then(function(){

		if(GmailElementGetter.isStandalone()){
			//do nothing
		}
		else{
			buttonDescriptorProperty.onValue((buttonDescriptor) => {

				if(!element && buttonDescriptor){
					element = _createAppButtonElement();
				}


				updateIcon(iconSettings, element.querySelector('a'), false, buttonDescriptor.iconClass, buttonDescriptor.iconUrl);
				_updateTitle(element.querySelector('span'), currentTitle, buttonDescriptor.title);
				currentTitle = buttonDescriptor.title;

				element.onclick = (event) => {
					event.preventDefault();

					if(activeDropdown){
						activeDropdown.close();
						activeDropdown = null;
					}
					else{
						var appEvent = {};
						var tooltipView = new GmailTooltipView();
						tooltipView.getContainerElement().classList.add('inboxsdk__appButton_tooltip');
						tooltipView.getContentElement().innerHTML = '';

						if(buttonDescriptor.arrowColor){
							tooltipView.getContainerElement().querySelector('.T-P-atC').style.borderTopColor = buttonDescriptor.arrowColor;
						}

						appEvent.dropdown = activeDropdown = new DropdownView(tooltipView, element, {manualPosition: true});
						appEvent.dropdown.on('destroy', function(){
		                  setTimeout(function(){
		                    activeDropdown = null;
		                  }, 1);
		                });

		                if(buttonDescriptor.onClick){
		                	buttonDescriptor.onClick(appEvent);
		                }

		                asap(() => {
		                	tooltipView.anchor(
		                		element,
		                		{
		                			position: 'bottom',
		                			offset: {
		                				top: 8
		                			}
		                		}
		                	);
		                });

					}
				};
			});
		}

	});

};

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

	insertionElement.insertBefore(element, insertionElement.firstElementChild);

	return element;

}

function _updateTitle(element, currentTitle, newTitle){
	if(currentTitle === newTitle){
		return;
	}

	element.textContent = newTitle;
}
