'use strict';

var _ = require('lodash');
var EventEmitter = require('../lib/safe-event-emitter');

var HandlerRegistry = require('../lib/handler-registry');

var ThreadRowView = require('../views/thread-row-view');
var ThreadView = require('../views/conversations/thread-view');
var ToolbarView = require('../views/toolbar-view'); //only used for internal bookkeeping

var AppToolbarButtonView = require('../views/app-toolbar-button-view');

var memberMap = new WeakMap();

/**
* @class
* The Toolbar namespace allows you to add your own buttons and actions to various toolbars in Gmail or
* Inbox. Toolbars appear in various Lists, ThreadViews and MessageViews. Within a toolbar, you have control
* over the placement of your buttons.
*
* Toolbar buttons are typically used to take actions on the email(s) that the toolbar applies to. Do not use
* this API to add buttons that don't take a direct action on the selected email.
*
* Since toolbar buttons only apply to emails, they will ONLY appear when an email is selected or you are
* on a ThreadView.
*/
var Toolbars = function(appId, driver, membraneMap){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.membraneMap = membraneMap;

	members.listButtonHandlerRegistry = new HandlerRegistry();
	members.threadViewHandlerRegistry = new HandlerRegistry();

	this.SectionNames = sectionNames;

	_setupToolbarViewDriverWatcher(this, members);
};

Toolbars.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbars.prototype, /** @lends Toolbars */ {

	/**
	* Registers a toolbar button to appear in any List such as the Inbox or Sent Mail.
	* @param {ToolbarButtonDescriptor} toolbarButtonDescriptor - The options for the button.
	* @return {void}
	*/
	registerToolbarButtonForList: function(buttonDescriptor){
		return memberMap.get(this).listButtonHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	},

	/**
	* Registers a toolbar button to appear in a conversation view.
	* @param {ToolbarButtonDescriptor} toolbarButtonDescriptor - The options for the button.
	* @return {void}
	*/
	registerToolbarButtonForThreadView: function(buttonDescriptor){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	},

	/**
	* Adds a button *and* dropdown to the "Global Toolbar". This is typically used to show a dropdobwn with general information about your application.
	*
	* In Gmail this refers to the navigation area at the top right of the window and in Inbox it refers to the top level toolbar.
	*
	* Your application can only add one app toolbar button.
	* @param {AppToolbarButtonDescriptor} appToolbarButtonDescriptor - The options for the app toolbar button
	* @return {AppToolbarButtonView}
	*/
	setAppToolbarButton: function(appToolbarButtonDescriptor){
		return this.addToolbarButtonForApp(appToolbarButtonDescriptor);
	},


	addToolbarButtonForApp: function(buttonDescriptor){
		var appToolbarButtonViewDriverPromise = memberMap.get(this).driver.addToolbarButtonForApp(buttonDescriptor);
		var appToolbarButtonView = new AppToolbarButtonView(appToolbarButtonViewDriverPromise);

		return appToolbarButtonView;
	}

});

function _getToolbarButtonHandler(buttonDescriptor, toolbarsInstance){
	return function(toolbarView){
		var members = memberMap.get(toolbarsInstance);

		var toolbarViewDriver = toolbarView.getToolbarViewDriver();

		if(buttonDescriptor.hideFor){
			var routeView = members.membraneMap.get(toolbarViewDriver.getRouteViewDriver());
			if(buttonDescriptor.hideFor(routeView)){
				return;
			}
		}

		toolbarViewDriver.addButton(_processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver), toolbarsInstance.SectionNames, members.appId);
	};
}


function _setupToolbarViewDriverWatcher(toolbars, members){
	members.driver.getToolbarViewDriverStream()
			.filter(function(toolbarViewDriver){
				return !!toolbarViewDriver.getEventStream();
			})
		   	.onValue(_handleNewToolbarViewDriver, toolbars, members);
}

function _handleNewToolbarViewDriver(toolbars, members, toolbarViewDriver){
	var toolbarView = new ToolbarView(toolbarViewDriver);

	if(toolbarViewDriver.getRowListViewDriver()){
		members.listButtonHandlerRegistry.addTarget(toolbarView);
	}
	else if(toolbarViewDriver.getThreadViewDriver()){
		members.threadViewHandlerRegistry.addTarget(toolbarView);
	}
}

function _processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver){
	var membraneMap = members.membraneMap;
	var buttonOptions = _.clone(buttonDescriptor);
	var oldOnClick = buttonOptions.onClick || function(){};

	buttonOptions.onClick = function(event){
		event = event || {};

		if(toolbarViewDriver.getRowListViewDriver()){
			_.merge(event, {
				threadRowViews: _getThreadRowViews(toolbarViewDriver, membraneMap),
				selectedThreadRowViews: _getSelectedThreadRowViews(toolbarViewDriver, membraneMap)
			});
		}
		else if(toolbarViewDriver.getThreadViewDriver()){
			var threadView = membraneMap.get(toolbarViewDriver.getThreadViewDriver());
			if(!threadView){
				threadView = new ThreadView(toolbarViewDriver.getThreadViewDriver(), members.appId, membraneMap);
				membraneMap.set(toolbarViewDriver.getThreadViewDriver(), threadView);
			}

			event.threadView = threadView;
		}

		oldOnClick(event);

	};

	return buttonOptions;
}

function _getThreadRowViews(toolbarViewDriver, membraneMap){
	return Array.from(
			toolbarViewDriver
				.getRowListViewDriver()
				.getThreadRowViewDrivers()
				.values()
		).map(_getThreadRowView(membraneMap));
}

function _getSelectedThreadRowViews(toolbarViewDriver, membraneMap){
	return _.chain(Array.from(
			toolbarViewDriver
				.getRowListViewDriver()
				.getThreadRowViewDrivers()
				.values()
		))
		.filter(threadRowViewDriver => threadRowViewDriver.isSelected())
		.map(_getThreadRowView(membraneMap))
		.value();
}

function _getThreadRowView(membraneMap){
	return function(threadRowViewDriver){
		var threadRowView = membraneMap.get(threadRowViewDriver);
		if(!threadRowView){
			threadRowView = new ThreadRowView(threadRowViewDriver);
			membraneMap.set(threadRowViewDriver, threadRowView);
		}

		return threadRowView;
	};
}


/**
* The different toolbar sections that exist
* @class
* @name SectionNames
*/
var sectionNames = Object.freeze(/** @lends SectionNames */ {

	/**
	* The section is for buttons that move emails out of or into the users inbox
	* @type string
	*/
	'INBOX_STATE': 'INBOX_STATE',

	/**
	* This section is for buttons that alter metadata of emails. Common examples are labeling or moving an email.
	* @type string
	*/
	'METADATA_STATE': 'METADATA_STATE',

	/**
	* This sectiom is used for other actions. Typically these will be placed in the "More"
	* menu in Gmail or in submenus in Inbox.
	* @type string
	*/
	'OTHER': 'OTHER'

});


/**
* @class
* This type is passed into the {Toolbars.registerToolbarButtonForList()} and
* {Toolbars.registerToolbarButtonForThreadView()} method as a way to configure
* the toolbar button shown.
*/
var ToolbarButtonDescriptor = /** @lends ToolbarButtonDescriptor */{

	/**
	* Text to show when the user hovers the mouse over the button, or to show on
	* the button when the user has the Gmail "Button labels" setting set to
	* "Text".
	* @type {string}
	*/
	title:null,

	/**
	* URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* An optional class to apply to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null,

	/**
	* The section of the toolbar to place the button.
	* @type {SectionNames}
	*/
	section:null,

	/**
	* This is called when the button is clicked, and gets passed an event object. The event object will have
	* a {selectedThreadRowViews} ({ThreadRowView[]}) property, a {threadRowViews}
	* ({ThreadRowView[]}) property and optionally a {dropdown} ({DropdownView}) property if you set
	* the {hasDropdown} property to true
	* @type {func(event)}
	*/
	onClick:null,

	/**
	* If true, the button will open a dropdown menu above it, and the event object will have a {dropdown} property of type {DropdownView} that
	* allows the dropdown to be customized when opened.
	* ^optional
	* ^default=false
	* @type {boolean}
	*/
	hasDropdown:null,

	/**
	* A function that determines when this toolbar button should be hidden. You may want to hide the
	* toolbar button on certain Routes or in certain conditions. The function should return true when
	* the toolbar button should be hidden. Your function is passed a {RouteView}.
	* ^optional
	* ^default=null
	* @type {func(RouteView)}
	*/
	hideFor:null,

	/**
	* The keyboard shortcut that will activate this button.
	* ^optional
	* ^default=null
	* @type {keyboardShortcutHandle}
	*/
	 keyboardShortcutHandle: null
};


/**
* @class
* This type is passed into the {Toolbars.addAppToolbarButton()} method as a way to configure
* the toolbar button shown.
*/
var AppToolbarButtonDescriptor = /** @lends AppToolbarButtonDescriptor */{

	/**
	* Text to show when the user hovers the mouse over the button
	* @type {string}
	*/
	title:null,

	/**
	* URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* An optional class to apply to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null,

	/**
	* This is called when the button is clicked, and gets passed an event object. The event object will have
	* a {dropdown} ({DropdownView}) property.
	* @type {func(event)}
	*/
	onClick:null,

	/**
	* The color to use for the top arrow of the dropdown. Useful if you want the contents of
	* your dropdown to have a specific background color
	* ^optional
	* ^default=null
	* @type {string}
	*/
	arrowColor: null
};

module.exports = Toolbars;
