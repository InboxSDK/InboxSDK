'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var dispatchCustomEvent = require('../../../../lib/dom/dispatch-custom-event');
var ButtonView = require('../../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../../widgets/buttons/basic-button-view-controller');
var DropdownButtonViewController = require('../../../../widgets/buttons/dropdown-button-view-controller');

var GmailDropdownView = require('../../widgets/gmail-dropdown-view');


function addButton(gmailComposeView, buttonDescriptorStream, groupOrderHint, extraOnClickOptions){
	var buttonViewController;

	return new RSVP.Promise(function(resolve, reject){

		buttonDescriptorStream
			.takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd())
			.onValue(function(buttonDescriptor){
				var buttonOptions = _processButtonDescriptor(buttonDescriptor, extraOnClickOptions);

				if(!buttonViewController){
					buttonViewController = _addButton(gmailComposeView, buttonOptions, groupOrderHint, extraOnClickOptions);
					resolve({
						buttonViewController: buttonViewController,
						composeViewDriver: gmailComposeView,
						buttonDescriptor: buttonDescriptor
					});
				}
				else{
					buttonViewController.getView().update(buttonOptions);
				}
			});

		gmailComposeView.getEventStream().onEnd(function(){
			resolve(null);
		});
	});

}

function _addButton(gmailComposeView, buttonDescriptor, groupOrderHint, extraOnClickOptions){
	if(!gmailComposeView.getElement() || !gmailComposeView.getFormattingToolbar()){
		return;
	}

	var buttonOptions = _processButtonDescriptor(buttonDescriptor, extraOnClickOptions);
	var buttonViewController;

	if(buttonOptions.type === 'MODIFIER'){
		buttonViewController = _addButtonToModifierArea(gmailComposeView, buttonOptions, groupOrderHint);
	}
	else if(buttonOptions.type === 'SEND_ACTION'){
		buttonViewController = _addButtonToSendActionArea(gmailComposeView, buttonOptions);
	}

	dispatchCustomEvent(gmailComposeView.getElement(), 'buttonAdded');

	return buttonViewController;
}

function _addButtonToModifierArea(gmailComposeView, buttonDescriptor, groupOrderHint){
	var buttonViewController = _getButtonViewController(buttonDescriptor);
	buttonViewController.getView().addClass('wG');
	buttonViewController.getView().getElement().setAttribute('tabindex', 1);
	buttonViewController.getView().getElement().setAttribute('data-order-hint', buttonDescriptor.orderHint);
	buttonViewController.getView().getElement().setAttribute('data-group-order-hint', groupOrderHint);

	var formattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft();
	var element = buttonViewController.getView().getElement();
	var actionToolbar = gmailComposeView.getAdditionalActionToolbar();

	var insertBeforeElement = _getInsertBeforeElement(actionToolbar, buttonDescriptor.orderHint, groupOrderHint);

	actionToolbar.insertBefore(element, insertBeforeElement);
	gmailComposeView.updateInsertMoreAreaLeft(formattingAreaOffsetLeft);

	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}


function _getInsertBeforeElement(containerElement, checkOrderHint, checkGroupOrderHint){
	var buttonElements = containerElement.querySelectorAll('[data-order-hint]');
	var insertBeforeElement = null;


	for(var ii=0; ii<buttonElements.length; ii++){
		var buttonElement = buttonElements[ii];
		var orderHint = buttonElement.getAttribute('data-order-hint');
		var groupOrderHint = buttonElement.getAttribute('data-group-order-hint');

		if(groupOrderHint > checkGroupOrderHint || (groupOrderHint === checkGroupOrderHint && orderHint > checkOrderHint) ){
			insertBeforeElement = buttonElement;
			break;
		}
	}

	return insertBeforeElement;
}

function _addButtonToSendActionArea(gmailComposeView, buttonDescriptor){
	var buttonViewController = _getButtonViewController(buttonDescriptor);
	buttonViewController.getView().addClass('inboxsdk__compose_sendButton');
	buttonViewController.getView().addClass('aoO');
	buttonViewController.getView().getElement().setAttribute('tabindex', 1);

	var sendButtonElement = gmailComposeView.getSendButton();

	sendButtonElement.insertAdjacentElement('afterend', buttonViewController.getView().getElement());
	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}

function _getButtonViewController(buttonDescriptor){
	var buttonViewController = null;

	var buttonView = new ButtonView(buttonDescriptor);
	buttonDescriptor.buttonView = buttonView;

	if(buttonDescriptor.hasDropdown){
		buttonDescriptor.dropdownViewDriverClass = GmailDropdownView;
		buttonDescriptor.dropdownPositionOptions = {isBottomAligned: true};
		buttonViewController = new DropdownButtonViewController(buttonDescriptor);
	}
	else{
		buttonViewController = new BasicButtonViewController(buttonDescriptor);
	}

	return buttonViewController;
}

function _processButtonDescriptor(buttonDescriptor, extraOnClickOptions){
	// clone the descriptor and set defaults.
	var buttonOptions = _.extend({
		type: 'MODIFIER'
	}, buttonDescriptor);

	var oldOnClick = buttonOptions.onClick;
	buttonOptions.onClick = function(event){
		oldOnClick(_.extend({}, extraOnClickOptions, event));
	};

	if(buttonDescriptor.hasDropdown){
		buttonOptions.dropdownShowFunction = buttonDescriptor.onClick;
	}
	else{
		buttonOptions.activateFunction = buttonDescriptor.onClick;
	}

	buttonOptions.noArrow = true;
	buttonOptions.tooltip = buttonOptions.tooltip || buttonOptions.title;
	delete buttonOptions.title;

	if(buttonOptions.type === 'MODIFIER'){
		buttonOptions.buttonColor = 'flatIcon';
	}
	else if(buttonOptions.type === 'SEND_ACTION'){
		buttonOptions.buttonColor = 'blue';
	}

	return buttonOptions;
}


module.exports = addButton;
