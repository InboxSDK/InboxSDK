'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Map = require('es6-unweak-collections').Map;

var ThreadRowView = require('../views/thread-row-view');
var ThreadView = require('../views/conversations/thread-view');

var memberMap = new Map();

var Toolbars = function(appId, driver, membraneMap){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.membraneMap = membraneMap;


	members.threadListButtonDescriptors = [];
	members.threadViewButtonDesriptors = [];

	members.threadListNoSelectionsMoreItemDescriptors = [];
	members.threadListWithSelectionsMoreItemDescriptors = [];
	members.threadViewMoreItemDescriptors = [];

	_setupViewDriverWatchers(this, members);
};

Toolbars.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbars.prototype, {

	registerThreadListNoSelectionsButton: function(buttonDescriptor){
		memberMap.get(this).threadListButtonDescriptors.push(_.merge(buttonDescriptor, {toolbarState: 'COLLASED'}));
	},

	registerThreadListWithSelectionsButton: function(buttonDescriptor){
		memberMap.get(this).threadListButtonDescriptors.push(_.merge(buttonDescriptor, {toolbarState: 'EXPANDED'}));
	},

	registerThreadViewButton: function(buttonDescriptor){
		memberMap.get(this).threadViewButtonDesriptors.push(buttonDescriptor);
	},

	registerThreadListNoSelectionsMoreItem: function(buttonDescriptor){
		memberMap.get(this).threadListNoSelectionsMoreItemDescriptors.push(buttonDescriptor);
	},

	registerThreadListWithSelectionsMoreItem: function(buttonDescriptor){
		memberMap.get(this).threadListWithSelectionsMoreItemDescriptors.push(buttonDescriptor);
	},

	registerThreadViewMoreItem: function(buttonDescriptor){
		memberMap.get(this).threadViewMoreItemDescriptors.push(buttonDescriptor);
	}

});


function _setupViewDriverWatchers(toolbars, members){
	_setupToolbarViewDriverWatcher(toolbars, members);
	_setupMoreMenuViewDriverWatcher(toolbars, members);
}

function _setupToolbarViewDriverWatcher(toolbars, members){
	members.driver.getToolbarViewDriverStream().onValue(_handleNewToolbarViewDriver, toolbars, members);
}

function _handleNewToolbarViewDriver(toolbars, members, toolbarViewDriver){
	var buttonDescriptors = null;

	if(toolbarViewDriver.getRowListViewDriver()){
		buttonDescriptors = members.threadListButtonDescriptors;
	}
	else if(toolbarViewDriver.getThreadViewDriver()){
		buttonDescriptors = members.threadViewButtonDesriptors;
	}

	_.chain(buttonDescriptors)
		.filter(function(buttonDescriptor){
			return true; /* deprecated */
			//return buttonDescriptor.showFor(fullscreenView);
		})
		.each(function(buttonDescriptor){
			toolbarViewDriver.addButton(_processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver));
		});

}

function _setupMoreMenuViewDriverWatcher(toolbars, members){
	//todo
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

module.exports = Toolbars;
