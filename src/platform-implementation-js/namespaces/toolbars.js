'use strict';

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import EventEmitter from '../lib/safe-event-emitter';

import HandlerRegistry from '../lib/handler-registry';

import ThreadRowView from '../views/thread-row-view';
import ThreadView from '../views/conversations/thread-view';
import ToolbarView from '../views/toolbar-view'; //only used for internal bookkeeping

import AppToolbarButtonView from '../views/app-toolbar-button-view';

const memberMap = new WeakMap();

// documented in src/docs/
const Toolbars = function(appId, driver, membraneMap){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.membraneMap = membraneMap;

	members.listButtonHandlerRegistry = new HandlerRegistry();
	members.threadViewHandlerRegistry = new HandlerRegistry();

	driver.getStopper().onValue(function() {
		members.listButtonHandlerRegistry.dumpHandlers();
		members.threadViewHandlerRegistry.dumpHandlers();
	});

	this.SectionNames = sectionNames;

	_setupToolbarViewDriverWatcher(this, members);
};

Toolbars.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbars.prototype, {

	registerToolbarButtonForList(buttonDescriptor){
		return memberMap.get(this).listButtonHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	},

	registerToolbarButtonForThreadView(buttonDescriptor){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	},

	setAppToolbarButton(appToolbarButtonDescriptor){
		const driver = memberMap.get(this).driver;
		driver.getLogger().deprecationWarning(
			'Toolbars.setAppToolbarButton', 'Toolbars.addToolbarButtonForApp');
		return this.addToolbarButtonForApp(appToolbarButtonDescriptor);
	},

	addToolbarButtonForApp(buttonDescriptor){
		const buttonDescriptorStream = kefirCast(Kefir, buttonDescriptor);
		const appToolbarButtonViewDriverPromise = memberMap.get(this).driver.addToolbarButtonForApp(buttonDescriptorStream);
		const appToolbarButtonView = new AppToolbarButtonView(memberMap.get(this).driver, appToolbarButtonViewDriverPromise);

		return appToolbarButtonView;
	}

});

function _getToolbarButtonHandler(buttonDescriptor, toolbarsInstance){
	// Used to help track our duplicate toolbar button issue.
	const id = `${Date.now()}-${Math.random()}-${buttonDescriptor.title}`;

	return function(toolbarView){
		var members = memberMap.get(toolbarsInstance);

		var toolbarViewDriver = toolbarView.getToolbarViewDriver();

		if(buttonDescriptor.hideFor){
			var routeView = members.membraneMap.get(toolbarViewDriver.getRouteViewDriver());
			if(buttonDescriptor.hideFor(routeView)){
				return;
			}
		}

		toolbarViewDriver.addButton(_processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver), toolbarsInstance.SectionNames, members.appId, id);
	};
}


function _setupToolbarViewDriverWatcher(toolbars, members){
	members.driver.getToolbarViewDriverStream()
		 		.onValue(toolbarViewDriver => {
					_handleNewToolbarViewDriver(toolbars, members, toolbarViewDriver);
				});
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
			Object.assign(event, {
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

var sectionNames = Object.freeze({
	'INBOX_STATE': 'INBOX_STATE',
	'METADATA_STATE': 'METADATA_STATE',
	'OTHER': 'OTHER'
});

module.exports = Toolbars;
