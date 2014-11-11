var $ = require('jquery');

var ButtonView = require('../../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../../widgets/buttons/basic-button-view-controller');
var MenuButtonViewController = require('../../../../widgets/buttons/menu-button-view-controller');

var MenuView = require('../../widgets/menu-view');

function addButton(gmailComposeView, buttonDescriptor){
	if(!buttonDescriptor.section || buttonDescriptor.section === 'TRAY_LEFT'){
		_addButtonToTrayLeft(gmailComposeView, buttonDescriptor);
	}
	else if(buttonDescriptor.section === 'SEND_RIGHT'){
		_addButtonToSendRight(gmailComposeView, buttonDescriptor);
	}
}

function _addButtonToTrayLeft(gmailComposeView, buttonDescriptor){
	buttonDescriptor.buttonColor = 'flatIcon';

	var buttonViewController = _getButtonViewController(buttonDescriptor);

	var formattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft();
	var element = buttonViewController.getView().getElement();

	var actionToolbar = gmailComposeView.getAdditionalActionToolbar();

	actionToolbar.prepend(element);
	gmailComposeView.updateInsertMoreAreaLeft(formattingAreaOffsetLeft);

	gmailComposeView.addManagedViewController(buttonViewController);
}

function _addButtonToSendRight(gmailComposeView, buttonDescriptor){
	//do nothing for now
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

module.exports = addButton;
