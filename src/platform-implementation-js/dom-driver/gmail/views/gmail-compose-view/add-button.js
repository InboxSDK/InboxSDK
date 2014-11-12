var _ = require('lodash');

var waitFor = require('../../../../lib/wait-for');

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
	var buttonViewController;

	if(!buttonOptions.section || buttonOptions.section === 'TRAY_LEFT'){
		buttonViewController = _addButtonToTrayLeft(gmailComposeView, buttonOptions);
	}
	else if(buttonOptions.section === 'SEND_RIGHT'){
		buttonViewController = _addButtonToSendRight(gmailComposeView, buttonOptions);
	}

	_groupButtonsIfNeeded(gmailComposeView);

	return buttonViewController;
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

function _groupButtonsIfNeeded(gmailComposeView){
	if(!_doButtonsNeedToGroup(gmailComposeView)){
		return;
	}

	var groupedActionToolbarContainer = _createGroupedActionToolbarContainer(gmailComposeView);
	var groupToggleButtonViewController = _createGroupToggleButtonViewController(gmailComposeView, groupedActionToolbarContainer);


	_swapToActionToolbar(gmailComposeView, groupToggleButtonViewController);
}

function _doButtonsNeedToGroup(gmailComposeView){
	return !gmailComposeView._additionalAreas.groupedActionToolbarContainer
			&& gmailComposeView.getElement().clientWidth < gmailComposeView.getBottomBarTable().clientWidth
			&& gmailComposeView.getElement().querySelectorAll('.inboxsdk__button').length > 2;
}

function _createGroupedActionToolbarContainer(gmailComposeView){
	var groupedActionToolbarContainer = document.createElement('div');
	groupedActionToolbarContainer.classList.add('inboxsdk__compose_groupedActionToolbar');
	groupedActionToolbarContainer.classList.add('pXSFsb');

	gmailComposeView._additionalAreas.groupedActionToolbarContainer = groupedActionToolbarContainer;
	groupedActionToolbarContainer.style.display = 'none';

	var groupedToolbarArea = gmailComposeView.getElement().querySelector('.aoP .Ur');

	// we add the groupedActionToolbarContainer twice because we really want the container element
	// to be a child of groupedToolbarArea, however there is a race condition if the groupedActionToolbarContainer
	// gets added to the groupedToolbarArea too early, Gmail sets the inner html and we lose the toolbarContainer
	// so we first add the container as a child of the compose and when the toolbarArea is ready we add it as a child
	gmailComposeView.getElement().appendChild(groupedActionToolbarContainer);

	waitFor(function(){
		return groupedToolbarArea.children.length > 0;
	}).then(function(){
		gmailComposeView.getElement().querySelector('.aoP .Ur').appendChild(groupedActionToolbarContainer);
	});

	return groupedActionToolbarContainer;
}

function _createGroupToggleButtonViewController(gmailComposeView){
	var buttonView = new ButtonView({
		tooltip: 'More Tools',
		iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAANUlEQVQ4y2NgGKyAkZCC/1OY/sMV5/zDq56Jmi4bNYyC2ESONZINgcbyEPDmaKIdBoYNXgAA8hYMHFMqIjsAAAAASUVORK5CYII=',
		buttonColor: 'flatIcon'
	});

	buttonView.addClass('wG');
	buttonView.getElement().setAttribute('tabindex', 1);

	var isExpanded = false;
	var buttonViewController = new BasicButtonViewController({
		buttonView: buttonView,
		activateFunction: function(){
			if(isExpanded){ //collapse
				gmailComposeView._additionalAreas.groupedActionToolbarContainer.style.display = 'none';
				buttonView.deactivate();
			}
			else{ //expand
				gmailComposeView._additionalAreas.groupedActionToolbarContainer.style.display = '';
				gmailComposeView._additionalAreas.groupedActionToolbarContainer.style.left = buttonView.getElement().offsetLeft + 'px';
				gmailComposeView._additionalAreas.groupedActionToolbarContainer.style.marginLeft = (buttonView.getElement().clientWidth/2 - gmailComposeView._additionalAreas.groupedActionToolbarContainer.offsetWidth/2 - 3) + 'px';

				gmailComposeView._additionalAreas.groupedActionToolbarContainer.querySelectorAll('.inboxsdk__button')[0].focus();

				buttonView.activate();
			}

			isExpanded = !isExpanded;
		}
	});

	gmailComposeView._additionalAreas.groupedActionToolbarContainer.addEventListener(
		'keydown',
		function(event){
			if(event.which === 27) { //escape
				buttonViewController.activate();

				buttonView.getElement().focus();

				event.preventDefault();
				event.stopPropagation();
			}
		}
	);

	gmailComposeView.addManagedViewController(buttonViewController);

	return buttonViewController;
}

function _swapToActionToolbar(gmailComposeView, buttonViewController){
	var actionToolbar = gmailComposeView.getElement().querySelector('.inboxsdk__compose_actionToolbar > div');
	var actionToolbarContainer = actionToolbar.parentElement;

	var newActionToolbar = document.createElement('div');
	newActionToolbar.appendChild(buttonViewController.getView().getElement());

	actionToolbarContainer.appendChild(newActionToolbar);

	gmailComposeView._additionalAreas.groupedActionToolbarContainer.appendChild(actionToolbar);
}

module.exports = addButton;
