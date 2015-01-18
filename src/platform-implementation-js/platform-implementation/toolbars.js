'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Map = require('es6-unweak-collections').Map;

var HandlerRegistry = require('../lib/handler-registry');

var ThreadRowView = require('../views/thread-row-view');
var ThreadView = require('../views/conversations/thread-view');
var ToolbarView = require('../views/toolbar-view'); //only used for internal bookkeeping


var memberMap = new Map();

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

_.extend(Toolbars.prototype, {

	registerToolbarButtonForList: function(buttonDescriptor){
		return memberMap.get(this).listButtonHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	},

	registerToolbarButtonForThreadView: function(buttonDescriptor){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
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

		toolbarViewDriver.addButton(_processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver), toolbarsInstance.SectionNames);
	};
}


function _setupToolbarViewDriverWatcher(toolbars, members){
	members.driver.getToolbarViewDriverStream().onValue(_handleNewToolbarViewDriver, toolbars, members);
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
* enum^The different toolbar sections that exist
* @class
* @name ToolbarSections
*/
var sectionNames = {};
Object.defineProperties(sectionNames, /** @lends SectionNames */ {
	/**
	* to the right of the checkbox button
	* @type string
	*/
	'CHECKBOX': {
		value: 'CHECKBOX',
		writable: false
	},

	/**
	* The section containing the archive/delete/trash buttons
	* @type string
	*/
	'ARCHIVE': {
		value: 'ARCHIVE',
		writable: false
	},

	/**
	* The section containing the move and label buttons
	* @type string
	*/
	'MOVE': {
		value: 'MOVE',
		writable: false
	},

	/**
	* Add an entry to the more menu
	* @type string
	*/
	'MORE': {
		value: 'MORE',
		writable: false
	}

});

module.exports = Toolbars;
