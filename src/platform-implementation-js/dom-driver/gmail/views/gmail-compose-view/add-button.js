var _ = require('lodash');

var ButtonView = require('../../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../../widgets/buttons/basic-button-view-controller');
var MenuButtonViewController = require('../../../../widgets/buttons/menu-button-view-controller');

var MenuView = require('../../widgets/menu-view');

function addButton(gmailComposeView, buttonDescriptor){
	if(buttonDescriptor.onValue){
		_addButtonStream(gmailComposeView, buttonDescriptor);
	}
	else{
		_addButton(gmailComposeView, buttonDescriptor);
	}
}

function _addButtonStream(gmailComposeView, buttonDescriptorStream){
	var buttonViewController;

	var unsubscribeFunction = buttonDescriptorStream.onValue(function(buttonDescriptor){

		var buttonOptions = _processButtonDescriptor(buttonDescriptor);

		if(!buttonViewController){
			buttonViewController = _addButton(gmailComposeView, buttonOptions);
		}
		else{
			buttonViewController.getView().update(buttonOptions);
		}
	});

	gmailComposeView.addUnsubscribeFunction(unsubscribeFunction);
}

function _addButton(gmailComposeView, buttonDescriptor){
	var buttonOptions = _processButtonDescriptor(buttonDescriptor);

	if(!buttonOptions.section || buttonOptions.section === 'TRAY_LEFT'){
		return _addButtonToTrayLeft(gmailComposeView, buttonOptions);
	}
	else if(buttonOptions.section === 'SEND_RIGHT'){
		return _addButtonToSendRight(gmailComposeView, buttonOptions);
	}
}

function _addButtonToTrayLeft(gmailComposeView, buttonDescriptor){
	var buttonViewController = _getButtonViewController(buttonDescriptor);
	buttonViewController.getView().addClass('wG');
	buttonViewController.getView().getElement().setAttribute('tabindex', 1);

	var formattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft();
	var element = buttonViewController.getView().getElement();

	var actionToolbar = gmailComposeView.getAdditionalActionToolbar();

	actionToolbar.insertBefore(element, actionToolbar.firstElementChild);
	gmailComposeView.updateInsertMoreAreaLeft(formattingAreaOffsetLeft);

	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}

function _addButtonToSendRight(gmailComposeView, buttonDescriptor){
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
		var menuView = new MenuView();
		buttonDescriptor.menuView = menuView;
		buttonDescriptor.menuPositionOptions = {isBottomAligned: true};
		buttonViewController = new MenuButtonViewController(buttonDescriptor);
	}
	else{
		buttonViewController = new BasicButtonViewController(buttonDescriptor);
	}

	return buttonViewController;
}

function _processButtonDescriptor(buttonDescriptor){
	var buttonOptions = _.clone(buttonDescriptor);
	if(buttonDescriptor.hasDropdown){
		buttonOptions.preMenuShowFunction = function(menuView){
			buttonDescriptor.onClick({
				dropdown: {
					el: menuView.getElement()
				}
			});
		};
	}
	else{
		buttonOptions.activateFunction = buttonDescriptor.onClick;
	}

	buttonOptions.noArrow = true;
	buttonOptions.tooltip = buttonOptions.tooltip || buttonOptions.title;
	delete buttonOptions.title;

	if(buttonOptions.section === 'TRAY_LEFT'){
		buttonOptions.buttonColor = 'flatIcon';
	}
	else if(buttonOptions.section === 'SEND_RIGHT'){
		buttonOptions.buttonColor = 'blue';
	}

	return buttonOptions;
}

module.exports = addButton;
