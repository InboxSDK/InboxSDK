/* @flow */

import RSVP from 'rsvp';
import Kefir from 'kefir';

import ButtonView from '../../widgets/buttons/button-view';
import BasicButtonViewController from '../../../../widgets/buttons/basic-button-view-controller';
import DropdownButtonViewController from '../../../../widgets/buttons/dropdown-button-view-controller';
import GmailDropdownView from '../../widgets/gmail-dropdown-view';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';

import type GmailComposeView from '../gmail-compose-view';

export default function addButton(gmailComposeView: GmailComposeView, buttonDescriptorStream: Kefir.Observable<?Object>, groupOrderHint: string, extraOnClickOptions: Object){
	return new RSVP.Promise(function(resolve, reject){
		let buttonViewController;

		buttonDescriptorStream
			.takeUntilBy(gmailComposeView.getStopper())
			.onValue((buttonDescriptor: ?Object) => {
				const buttonOptions = _processButtonDescriptor(buttonDescriptor, extraOnClickOptions);

				if(!buttonViewController){
					if (buttonOptions) {
						buttonViewController = _addButton(gmailComposeView, buttonOptions, groupOrderHint);
						resolve({
							buttonViewController: buttonViewController,
							buttonDescriptor: buttonDescriptor
						});
					}
				}
				else{
					buttonViewController.update(buttonOptions);
				}
			})
			.onEnd(() => {
				// Just in case things end without ever resolving above.
				resolve(null);
			});
	});

}

function _addButton(gmailComposeView: GmailComposeView, buttonOptions: Object, groupOrderHint: string){
	if(!gmailComposeView.getElement() || !gmailComposeView.getFormattingToolbar()){
		return;
	}

	let buttonViewController;
	if(buttonOptions.type === 'MODIFIER'){
		buttonViewController = _addButtonToModifierArea(gmailComposeView, buttonOptions, groupOrderHint);
	}
	else if(buttonOptions.type === 'SEND_ACTION'){
		buttonViewController = _addButtonToSendActionArea(gmailComposeView, buttonOptions);
	}

	gmailComposeView.getElement().dispatchEvent(new CustomEvent('buttonAdded', {
		bubbles: false, cancelable: false, detail: null
	}));

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
	buttonViewController.getView().getElement().setAttribute('tabindex', '1');

	var sendButtonElement = gmailComposeView.getSendButton();

	var buttonElement: HTMLElement = buttonViewController.getView().getElement();
	var parent: HTMLElement = (sendButtonElement.parentElement:any);
	parent.insertBefore(buttonElement, sendButtonElement.nextSibling);

	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}

function _getButtonViewController(buttonDescriptor: Object){
	const buttonView = new ButtonView(buttonDescriptor);
	const options = {buttonView, ...buttonDescriptor};

	let buttonViewController;
	if(buttonDescriptor.hasDropdown){
		Object.assign(options, {
			dropdownViewDriverClass: GmailDropdownView,
			dropdownPositionOptions: {vAlign: 'top'}
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

	const buttonOptions = {
		type: 'MODIFIER',
		...buttonDescriptor
	};

	const oldOnClick = buttonOptions.onClick;
	buttonOptions.onClick = function(event){
		oldOnClick({...extraOnClickOptions, ...event});
	};

	if(buttonOptions.hasDropdown){
		buttonOptions.dropdownShowFunction = buttonOptions.onClick;
	}
	else{
		buttonOptions.activateFunction = buttonOptions.onClick;
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
