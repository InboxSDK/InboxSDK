var _ = require('lodash');

var waitFor = require('../../../../lib/wait-for');
var simulateClick = require('../../../../lib/dom/simulate-click');

var ButtonView = require('../../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../../widgets/buttons/basic-button-view-controller');
var DropdownButtonViewController = require('../../../../widgets/buttons/dropdown-button-view-controller');

var GmailDropdownView = require('../../widgets/gmail-dropdown-view');

function addButton(gmailComposeView, buttonDescriptor, groupOrderHint, extraOnClickOptions){
	if(buttonDescriptor.onValue){
		_addButtonStream(gmailComposeView, buttonDescriptor, groupOrderHint, extraOnClickOptions);
	}
	else{
		_addButton(gmailComposeView, buttonDescriptor, groupOrderHint, extraOnClickOptions);
	}
}

function _addButtonStream(gmailComposeView, buttonDescriptorStream, groupOrderHint, extraOnClickOptions){
	var buttonViewController;

	var unsubscribeFunction = buttonDescriptorStream.onValue(function(buttonDescriptor){

		var buttonOptions = _processButtonDescriptor(buttonDescriptor, extraOnClickOptions);

		if(!buttonViewController){
			buttonViewController = _addButton(gmailComposeView, buttonOptions, groupOrderHint, extraOnClickOptions);
		}
		else{
			buttonViewController.getView().update(buttonOptions);
		}
	});

	gmailComposeView.addUnsubscribeFunction(unsubscribeFunction);
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

	_groupButtonsIfNeeded(gmailComposeView);
	_fixToolbarPosition(gmailComposeView);

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

function _groupButtonsIfNeeded(gmailComposeView){
	if(!_doButtonsNeedToGroup(gmailComposeView)){
		return;
	}

	var groupedActionToolbarContainer = _createGroupedActionToolbarContainer(gmailComposeView);
	var groupToggleButtonViewController = _createGroupToggleButtonViewController(gmailComposeView, groupedActionToolbarContainer);


	_swapToActionToolbar(gmailComposeView, groupToggleButtonViewController);
	_checkAndSetInitialState(gmailComposeView, groupToggleButtonViewController);
	_startMonitoringFormattingToolbar(gmailComposeView, groupToggleButtonViewController);
}

function _doButtonsNeedToGroup(gmailComposeView){
	return !gmailComposeView.getElement().querySelector('.inboxsdk__compose_groupedActionToolbar') &&
			gmailComposeView.getElement().clientWidth < gmailComposeView.getBottomBarTable().clientWidth &&
			gmailComposeView.getElement().querySelectorAll('.inboxsdk__button').length > 2;
}

function _createGroupedActionToolbarContainer(gmailComposeView){
	var groupedActionToolbarContainer = document.createElement('div');
	groupedActionToolbarContainer.classList.add('inboxsdk__compose_groupedActionToolbar');
	groupedActionToolbarContainer.innerHTML = '<div class="inboxsdk__compose_groupedActionToolbar_arrow"> </div>';


	gmailComposeView._additionalAreas.groupedActionToolbarContainer = groupedActionToolbarContainer;
	groupedActionToolbarContainer.style.display = 'none';
}

function _createGroupToggleButtonViewController(gmailComposeView){
	var buttonView = _createGroupToggleButtonView();

	var buttonViewController = new BasicButtonViewController({
		buttonView: buttonView,
		activateFunction: function(){
			_toggleGroupButtonToolbar(gmailComposeView, buttonViewController);

			if(_isToggleExpanded()){
				gmailComposeView._additionalAreas.groupedActionToolbarContainer.querySelectorAll('.inboxsdk__button')[0].focus();
			}
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

function _createGroupToggleButtonView(){
	var buttonView = new ButtonView({
		tooltip: 'More Tools',
		iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAEJGlDQ1BJQ0MgUHJvZmlsZQAAOBGFVd9v21QUPolvUqQWPyBYR4eKxa9VU1u5GxqtxgZJk6XtShal6dgqJOQ6N4mpGwfb6baqT3uBNwb8AUDZAw9IPCENBmJ72fbAtElThyqqSUh76MQPISbtBVXhu3ZiJ1PEXPX6yznfOec7517bRD1fabWaGVWIlquunc8klZOnFpSeTYrSs9RLA9Sr6U4tkcvNEi7BFffO6+EdigjL7ZHu/k72I796i9zRiSJPwG4VHX0Z+AxRzNRrtksUvwf7+Gm3BtzzHPDTNgQCqwKXfZwSeNHHJz1OIT8JjtAq6xWtCLwGPLzYZi+3YV8DGMiT4VVuG7oiZpGzrZJhcs/hL49xtzH/Dy6bdfTsXYNY+5yluWO4D4neK/ZUvok/17X0HPBLsF+vuUlhfwX4j/rSfAJ4H1H0qZJ9dN7nR19frRTeBt4Fe9FwpwtN+2p1MXscGLHR9SXrmMgjONd1ZxKzpBeA71b4tNhj6JGoyFNp4GHgwUp9qplfmnFW5oTdy7NamcwCI49kv6fN5IAHgD+0rbyoBc3SOjczohbyS1drbq6pQdqumllRC/0ymTtej8gpbbuVwpQfyw66dqEZyxZKxtHpJn+tZnpnEdrYBbueF9qQn93S7HQGGHnYP7w6L+YGHNtd1FJitqPAR+hERCNOFi1i1alKO6RQnjKUxL1GNjwlMsiEhcPLYTEiT9ISbN15OY/jx4SMshe9LaJRpTvHr3C/ybFYP1PZAfwfYrPsMBtnE6SwN9ib7AhLwTrBDgUKcm06FSrTfSj187xPdVQWOk5Q8vxAfSiIUc7Z7xr6zY/+hpqwSyv0I0/QMTRb7RMgBxNodTfSPqdraz/sDjzKBrv4zu2+a2t0/HHzjd2Lbcc2sG7GtsL42K+xLfxtUgI7YHqKlqHK8HbCCXgjHT1cAdMlDetv4FnQ2lLasaOl6vmB0CMmwT/IPszSueHQqv6i/qluqF+oF9TfO2qEGTumJH0qfSv9KH0nfS/9TIp0Wboi/SRdlb6RLgU5u++9nyXYe69fYRPdil1o1WufNSdTTsp75BfllPy8/LI8G7AUuV8ek6fkvfDsCfbNDP0dvRh0CrNqTbV7LfEEGDQPJQadBtfGVMWEq3QWWdufk6ZSNsjG2PQjp3ZcnOWWing6noonSInvi0/Ex+IzAreevPhe+CawpgP1/pMTMDo64G0sTCXIM+KdOnFWRfQKdJvQzV1+Bt8OokmrdtY2yhVX2a+qrykJfMq4Ml3VR4cVzTQVz+UoNne4vcKLoyS+gyKO6EHe+75Fdt0Mbe5bRIf/wjvrVmhbqBN97RD1vxrahvBOfOYzoosH9bq94uejSOQGkVM6sN/7HelL4t10t9F4gPdVzydEOx83Gv+uNxo7XyL/FtFl8z9ZAHF4bBsrEwAAADxJREFUOBFjYKASYISa8x/NPJLFmdAMIJs7+Awi2ys000hy7EBdghHLgy+wqeYimgU+2QaPxhrZQUe6RgBYwgkWqJftAwAAAABJRU5ErkJggg==',
		buttonColor: 'flatIcon'
	});

	buttonView.addClass('wG');
	buttonView.addClass('inboxsdk__compose_groupedActionButton');
	buttonView.getElement().setAttribute('tabindex', 1);

	return buttonView;
}


function _swapToActionToolbar(gmailComposeView, buttonViewController){
	var actionToolbar = gmailComposeView.getElement().querySelector('.inboxsdk__compose_actionToolbar > div');
	var actionToolbarContainer = actionToolbar.parentElement;

	var newActionToolbar = document.createElement('div');
	newActionToolbar.appendChild(buttonViewController.getView().getElement());

	actionToolbarContainer.appendChild(newActionToolbar);
	gmailComposeView._additionalAreas.groupedActionToolbarContainer.insertBefore(actionToolbar, gmailComposeView._additionalAreas.groupedActionToolbarContainer.firstElementChild);
	actionToolbarContainer.appendChild(gmailComposeView._additionalAreas.groupedActionToolbarContainer);
}

function _checkAndSetInitialState(gmailComposeView, groupToggleButtonViewController){
	if(_isToggleExpanded()){
		setTimeout(function(){ //do in timeout so that we wait for all buttons to get added
			localStorage['inboxsdk__compose_groupedActionButton_state'] = 'collapsed';
			_toggleGroupButtonToolbar(gmailComposeView, groupToggleButtonViewController);
		},1);
	}
}

function _toggleGroupButtonToolbar(gmailComposeView, buttonViewController){
	if(_isToggleExpanded()){ //collapse
		gmailComposeView._additionalAreas.groupedActionToolbarContainer.style.display = 'none';
		gmailComposeView.getElement().classList.remove('inboxsdk__compose_groupedActionToolbar_visible');

		buttonViewController.getView().deactivate();
		localStorage['inboxsdk__compose_groupedActionButton_state'] = 'collapsed';
	}
	else{ //expand
		gmailComposeView._additionalAreas.groupedActionToolbarContainer.style.display = '';
		gmailComposeView.getElement().classList.add('inboxsdk__compose_groupedActionToolbar_visible');

		buttonViewController.getView().activate();
		localStorage['inboxsdk__compose_groupedActionButton_state'] = 'expanded';

		_positionGroupToolbar(gmailComposeView);

		if(gmailComposeView.getFormattingToolbar() && gmailComposeView.getFormattingToolbar().style.display === ''){
			simulateClick(gmailComposeView.getFormattingToolbarToggleButton());
		}
	}
}

function _isToggleExpanded(){
	return localStorage['inboxsdk__compose_groupedActionButton_state'] === 'expanded';
}

function _fixToolbarPosition(gmailComposeView){
	_positionFormattingToolbar(gmailComposeView);

	var groupedActionToolbarContainer = gmailComposeView.getElement().querySelector('.inboxsdk__compose_groupedActionToolbar');
	if(!groupedActionToolbarContainer){
		return;
	}

	if(groupedActionToolbarContainer.style.display === 'none'){
		return;
	}
	_positionGroupToolbar(gmailComposeView);
}

function _positionGroupToolbar(gmailComposeView){
	var groupedActionToolbarContainer = gmailComposeView.getElement().querySelector('.inboxsdk__compose_groupedActionToolbar');

	if(!groupedActionToolbarContainer){
		return;
	}

	var groupedToolbarButton = gmailComposeView.getElement().querySelector('.inboxsdk__compose_groupedActionButton');
	var groupedActionToolbarArrow = groupedActionToolbarContainer.querySelector('.inboxsdk__compose_groupedActionToolbar_arrow');

	groupedActionToolbarContainer.style.display = '';

	if((groupedToolbarButton.offsetLeft + groupedToolbarButton.clientWidth) > groupedActionToolbarContainer.offsetWidth){
		groupedActionToolbarContainer.style.left = groupedToolbarButton.offsetLeft + 'px';
		groupedActionToolbarContainer.style.marginLeft = (groupedToolbarButton.clientWidth/2 - groupedActionToolbarContainer.offsetWidth/2 - 3) + 'px';
	}
	else{
		groupedActionToolbarContainer.style.left = '';
		groupedActionToolbarContainer.style.marginLeft = '';
	}

	groupedActionToolbarContainer.style.bottom = (gmailComposeView.getBottomToolbarContainer().clientHeight + 1) + 'px';

	groupedActionToolbarArrow.style.left = (groupedToolbarButton.offsetLeft/2 + 1) + 'px';
}

function _positionFormattingToolbar(gmailComposeView){
	if(gmailComposeView.getFormattingToolbar() && gmailComposeView.getFormattingToolbar().style.display === ''){
		var arrowElement = gmailComposeView.getFormattingToolbarArrow();
		var buttonElement = gmailComposeView.getFormattingToolbarToggleButton();

		var left = buttonElement.offsetLeft+buttonElement.clientWidth/2-arrowElement.offsetWidth/2;
		arrowElement.style.left = left + 'px';
	}
}

function _startMonitoringFormattingToolbar(gmailComposeView, groupToggleButtonViewController){
	waitFor(function(){
		try{
			return !!gmailComposeView.getFormattingToolbar();
		}
		catch(err){
			throw 'skip';
		}

	}).then(function(){

		var mutationObserver = new MutationObserver(function(mutations){

			if(mutations[0].target.style.display === '' && localStorage['inboxsdk__compose_groupedActionButton_state'] === 'expanded'){
				groupToggleButtonViewController.activate();
			}

		});

		mutationObserver.observe(
			gmailComposeView.getFormattingToolbar(),
			{attributes: true, attributeFilter: ['style']}
		);

	}).catch(function(err){
		if(err !== 'skip'){
			throw err;
		}
	});
}

module.exports = addButton;
