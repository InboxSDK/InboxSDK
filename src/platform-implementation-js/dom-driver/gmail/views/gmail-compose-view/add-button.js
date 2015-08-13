/* @flow */
//jshint ignore:start

var _ = require('lodash');
var RSVP = require('rsvp');
var Kefir = require('kefir');

import dispatchCustomEvent from '../../../../lib/dom/dispatch-custom-event';
import ButtonView from '../../widgets/buttons/button-view';
import BasicButtonViewController from '../../../../widgets/buttons/basic-button-view-controller';
import DropdownButtonViewController from '../../../../widgets/buttons/dropdown-button-view-controller';
import GmailDropdownView from '../../widgets/gmail-dropdown-view';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';

import type GmailComposeView from '../gmail-compose-view';

export default function addButton(gmailComposeView: GmailComposeView, buttonDescriptorStream: Kefir.Stream, groupOrderHint: string, extraOnClickOptions: Object){
	return new RSVP.Promise(function(resolve, reject){
		var buttonViewController;

		buttonDescriptorStream
			.takeUntilBy(gmailComposeView.getStopper())
			.onValue((buttonDescriptor) => {
				var buttonOptions = _processButtonDescriptor(buttonDescriptor, extraOnClickOptions);

				if(!buttonViewController){
					if (buttonOptions) {
						buttonViewController = _addButton(gmailComposeView, buttonOptions, groupOrderHint, extraOnClickOptions);
						resolve({
							buttonViewController: buttonViewController,
							composeViewDriver: gmailComposeView,
							buttonDescriptor: buttonDescriptor
						});
					}
				}
				else{
					buttonViewController.getView().update(buttonOptions);
				}
			});
	});

}

function _addButton(gmailComposeView: GmailComposeView, buttonDescriptor: Object, groupOrderHint: string, extraOnClickOptions: Object){
	if(!gmailComposeView.getElement() || !gmailComposeView.getFormattingToolbar()){
		return;
	}

	var buttonOptions = _processButtonDescriptor(buttonDescriptor, extraOnClickOptions);
	if (!buttonOptions) throw new Error("Should not happen");
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

function _addButtonToModifierArea(gmailComposeView: GmailComposeView, buttonDescriptor: Object, groupOrderHint: string){
	var buttonViewController = _getButtonViewController(buttonDescriptor);
	buttonViewController.getView().addClass('wG');
	buttonViewController.getView().getElement().setAttribute('tabindex', '1');
	buttonViewController.getView().getElement().setAttribute('data-order-hint', String(buttonDescriptor.orderHint||0));
	buttonViewController.getView().getElement().setAttribute('data-group-order-hint', groupOrderHint);

	var formattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft();
	var element: HTMLElement = buttonViewController.getView().getElement();
	var actionToolbar: HTMLElement = gmailComposeView.getAdditionalActionToolbar();

	insertElementInOrder(actionToolbar, element);
	gmailComposeView.updateInsertMoreAreaLeft(formattingAreaOffsetLeft);

	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}

function _addButtonToSendActionArea(gmailComposeView, buttonDescriptor){
	var buttonViewController = _getButtonViewController(buttonDescriptor);
	buttonViewController.getView().addClass('inboxsdk__compose_sendButton');
	buttonViewController.getView().addClass('aoO');
	buttonViewController.getView().getElement().setAttribute('tabindex', 1);

	var sendButtonElement = gmailComposeView.getSendButton();

	var buttonElement: HTMLElement = buttonViewController.getView().getElement();
	var parent: HTMLElement = (sendButtonElement.parentElement:any);
	parent.insertBefore(buttonElement, sendButtonElement.nextSibling);

	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}

function _getButtonViewController(buttonDescriptor: Object){
	var buttonView = new ButtonView(buttonDescriptor);
	var options = _.assign({buttonView}, buttonDescriptor);

	var buttonViewController;
	if(buttonDescriptor.hasDropdown){
		_.assign(options, {
			dropdownViewDriverClass: GmailDropdownView,
			dropdownPositionOptions: {isBottomAligned: true}
		});
		buttonViewController = new DropdownButtonViewController(options);
	}
	else{
		buttonViewController = new BasicButtonViewController(options);
	}

	return buttonViewController;
}

function _processButtonDescriptor(buttonDescriptor: ?Object, extraOnClickOptions: Object): ?Object {
	// clone the descriptor and set defaults.
	if (!buttonDescriptor) {
		return null;
	}

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
