'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Map = require('es6-unweak-collections').Map;

var ThreadRowView = require('../views/thread-row-view');
var ThreadView = require('../views/conversations/thread-view');

var memberMap = new Map();

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

	members.listButtonDescriptors = [];
	members.threadViewButtonDescriptors = [];

	this.SectionNames = sectionNames;

	_setupToolbarViewDriverWatcher(this, members);
};

Toolbars.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbars.prototype, /** @lends Toolbars */ {

	/**
	* Registers a toolbar button to appear in any List such as the Inbox or Sent Mail.
	* @param {ToolbarButtonDescriptor} toolbarButtonDescriptor - the options for the button
	* @return {void}
	*/
	registerToolbarButtonForList: function(buttonDescriptor){
		var members = memberMap.get(this);
		members.listButtonDescriptors.push(buttonDescriptor);

		return function(){
			_unregisterButtonDescriptor(members.get(this).listButtonDescriptors, buttonDescriptor);
		};
	},

	/**
	* Registers a toolbar button to appear in a conversation view.
	* @param {ToolbarButtonDescriptor} toolbarButtonDescriptor - the options for the button
	* @return {void}
	*/
	registerToolbarButtonForThreadView: function(buttonDescriptor){
		var members = memberMap.get(this);
		members.threadViewButtonDescriptors.push(buttonDescriptor);

		return function(){
			_unregisterButtonDescriptor(members.get(this).threadViewButtonDescriptors, buttonDescriptor);
		};
	}

});


function _unregisterButtonDescriptor(list, buttonDescriptor){
	var index = list.indexOf(buttonDescriptor);
	list.splice(index, 1);
}


function _setupToolbarViewDriverWatcher(toolbars, members){
	members.driver.getToolbarViewDriverStream().onValue(_handleNewToolbarViewDriver, toolbars, members);
}

function _handleNewToolbarViewDriver(toolbars, members, toolbarViewDriver){
	var buttonDescriptors = null;

	if(toolbarViewDriver.getRowListViewDriver()){
		buttonDescriptors = members.listButtonDescriptors;
	}
	else if(toolbarViewDriver.getThreadViewDriver()){
		buttonDescriptors = members.threadViewButtonDescriptors;
	}

	_.chain(buttonDescriptors)
		.filter(function(buttonDescriptor){
			if(!buttonDescriptor.hideFor){
				return true;
			}

			var routeView = members.membraneMap.get(toolbarViewDriver.getRouteViewDriver());

			if(buttonDescriptor.hideFor(routeView)){
				return false;
			}

			return true;
		})
		.each(function(buttonDescriptor){
			toolbarViewDriver.addButton(_processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver), sectionNames);
		});

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
			}

			event.threadView = threadView;
		}

		oldOnClick(event);

	};

	return buttonOptions;
}

function _getThreadRowViews(toolbarViewDriver, membraneMap){
	return toolbarViewDriver
			.getRowListViewDriver()
			.getThreadRowViewDrivers()
			.map(_getThreadRowView(membraneMap));
}

function _getSelectedThreadRowViews(toolbarViewDriver, membraneMap){
	return toolbarViewDriver
			.getRowListViewDriver()
			.getThreadRowViewDrivers()
			.filter(function(threadRowViewDriver){
				return threadRowViewDriver.isSelected();
			})
			.map(_getThreadRowView(membraneMap));
}

function _getThreadRowView(membraneMap){
	return function(threadRowViewDriver){
		var threadRowView = membraneMap.get(threadRowViewDriver);
		if(!threadRowView){
			threadRowView = new ThreadRowView(threadRowViewDriver);
			membraneMap.set(threadRowView);
		}

		return threadRowView;
	};
}


/**
* The different toolbar sections that exist
* @class
* @name ToolbarSections
*/
var sectionNames = {};
Object.defineProperties(sectionNames, /** @lends ToolbarSections */ {

	/**
	* The section is for buttons that move emails out of or into the users inbox
	* @type string
	*/
	'INBOX_STATE': {
		value: 'INBOX_STATE',
		writable: false
	},

	/**
	* This section is for buttons that alter metadata of emails. Common examples are labeling or moving an email.
	* @type string
	*/
	'METADATA_STATE': {
		value: 'METADATA_STATE',
		writable: false
	},

	/**
	* This sectiom is used for other actions. Typically these will be placed in the "More"
	* menu in Gmail or in submenus in Inbox.
	* @type string
	*/
	'OTHER': {
		value: 'OTHER',
		writable: false
	}

});

module.exports = Toolbars;
