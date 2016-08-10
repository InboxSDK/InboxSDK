/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import EventEmitter from '../lib/safe-event-emitter';

import HandlerRegistry from '../lib/handler-registry';

import type {Driver} from '../driver-interfaces/driver';
import type Membrane from '../lib/Membrane';
import ThreadRowView from '../views/thread-row-view';
import ThreadView from '../views/conversations/thread-view';
import ToolbarView from '../views/toolbar-view'; //only used for internal bookkeeping

import AppToolbarButtonView from '../views/app-toolbar-button-view';

const memberMap = new WeakMap();

// documented in src/docs/
export default class Toolbars extends EventEmitter {
	SectionNames: Object;

	constructor(appId: string, driver: Driver, membrane: Membrane, membraneMap: WeakMap<Object, Object>) {
		super();

		const members = {
			appId, driver, membrane, membraneMap,
			listButtonHandlerRegistry: new HandlerRegistry(),
			threadViewHandlerRegistry: new HandlerRegistry()
		};
		memberMap.set(this, members);

		driver.getStopper().onValue(function() {
			members.listButtonHandlerRegistry.dumpHandlers();
			members.threadViewHandlerRegistry.dumpHandlers();
		});

		this.SectionNames = sectionNames;

		_setupToolbarViewDriverWatcher(this, members);
	}

	registerToolbarButtonForList(buttonDescriptor: Object){
		return memberMap.get(this).listButtonHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	}

	registerToolbarButtonForThreadView(buttonDescriptor: Object){
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	}

	setAppToolbarButton(appToolbarButtonDescriptor: Object){
		const driver = memberMap.get(this).driver;
		driver.getLogger().deprecationWarning(
			'Toolbars.setAppToolbarButton', 'Toolbars.addToolbarButtonForApp');
		return this.addToolbarButtonForApp(appToolbarButtonDescriptor);
	}

	addToolbarButtonForApp(buttonDescriptor: Object){
		const buttonDescriptorStream = kefirCast(Kefir, buttonDescriptor);
		const appToolbarButtonViewDriverPromise = memberMap.get(this).driver.addToolbarButtonForApp(buttonDescriptorStream);
		const appToolbarButtonView = new AppToolbarButtonView(memberMap.get(this).driver, appToolbarButtonViewDriverPromise);

		return appToolbarButtonView;
	}
}

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
	const {membrane} = members;
	var buttonOptions = _.clone(buttonDescriptor);
	var oldOnClick = buttonOptions.onClick || function(){};

	buttonOptions.onClick = function(event){
		event = event || {};

		if(toolbarViewDriver.getRowListViewDriver()){
			Object.assign(event, {
				threadRowViews: _getThreadRowViews(toolbarViewDriver, membrane),
				selectedThreadRowViews: _getSelectedThreadRowViews(toolbarViewDriver, membrane)
			});
		}
		else if(toolbarViewDriver.getThreadViewDriver()){
			const threadView = membrane.get(toolbarViewDriver.getThreadViewDriver());
			event.threadView = threadView;
		}

		oldOnClick(event);

	};

	return buttonOptions;
}

function _getThreadRowViews(toolbarViewDriver, membrane: Membrane){
	return Array.from(
			toolbarViewDriver
				.getRowListViewDriver()
				.getThreadRowViewDrivers()
				.values()
		).map(_getThreadRowView(membrane));
}

function _getSelectedThreadRowViews(toolbarViewDriver, membrane: Membrane){
	return _.chain(Array.from(
			toolbarViewDriver
				.getRowListViewDriver()
				.getThreadRowViewDrivers()
				.values()
		))
		.filter(threadRowViewDriver => threadRowViewDriver.isSelected())
		.map(_getThreadRowView(membrane))
		.value();
}

function _getThreadRowView(membrane: Membrane){
	return function(threadRowViewDriver){
		const threadRowView = membrane.get(threadRowViewDriver);
		return threadRowView;
	};
}

var sectionNames = Object.freeze({
	'INBOX_STATE': 'INBOX_STATE',
	'METADATA_STATE': 'METADATA_STATE',
	'OTHER': 'OTHER'
});
