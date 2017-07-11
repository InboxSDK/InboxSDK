/* @flow */

import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import EventEmitter from '../lib/safe-event-emitter';
import HandlerRegistry from '../lib/handler-registry';
import type {Driver} from '../driver-interfaces/driver';
import type {PiOpts} from '../platform-implementation';
import type Membrane from '../lib/Membrane';
import get from '../../common/get-or-fail';
import ThreadRowView from '../views/thread-row-view';
import ThreadView from '../views/conversations/thread-view';
import ToolbarView from '../views/toolbar-view'; //only used for internal bookkeeping

import AppToolbarButtonView from '../views/app-toolbar-button-view';

type Members = {
	appId: string;
	driver: Driver;
	membrane: Membrane;
	piOpts: PiOpts;
	listButtonHandlerRegistry: HandlerRegistry<ToolbarView>;
	threadViewHandlerRegistry: HandlerRegistry<ToolbarView>;
};

const memberMap: WeakMap<Toolbars, Members> = new WeakMap();

const sectionNames = Object.freeze({
	'INBOX_STATE': 'INBOX_STATE',
	'METADATA_STATE': 'METADATA_STATE',
	'OTHER': 'OTHER'
});

// documented in src/docs/
export default class Toolbars extends EventEmitter {
	SectionNames: Object;

	constructor(appId: string, driver: Driver, membrane: Membrane, piOpts: PiOpts) {
		super();

		const members: Members = {
			appId, driver, membrane, piOpts,
			listButtonHandlerRegistry: (new HandlerRegistry(): HandlerRegistry<ToolbarView>),
			threadViewHandlerRegistry: (new HandlerRegistry(): HandlerRegistry<ToolbarView>),
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
		return get(memberMap, this).listButtonHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	}

	registerToolbarButtonForThreadView(buttonDescriptor: Object){
		return get(memberMap, this).threadViewHandlerRegistry.registerHandler(_getToolbarButtonHandler(buttonDescriptor, this));
	}

	setAppToolbarButton(appToolbarButtonDescriptor: Object){
		const {driver, piOpts} = get(memberMap, this);
		driver.getLogger().deprecationWarning(
			'Toolbars.setAppToolbarButton', 'Toolbars.addToolbarButtonForApp');
		if (piOpts.REQUESTED_API_VERSION !== 1) {
			throw new Error('This method was discontinued after API version 1');
		}
		return this.addToolbarButtonForApp(appToolbarButtonDescriptor);
	}

	addToolbarButtonForApp(buttonDescriptor: Object){
		const buttonDescriptorStream = kefirCast(Kefir, buttonDescriptor);
		const appToolbarButtonViewDriverPromise = get(memberMap, this).driver.addToolbarButtonForApp(buttonDescriptorStream);
		const appToolbarButtonView = new AppToolbarButtonView(get(memberMap, this).driver, appToolbarButtonViewDriverPromise);

		return appToolbarButtonView;
	}
}

function _getToolbarButtonHandler(buttonDescriptor, toolbarsInstance){
	// Used to help track our duplicate toolbar button issue.
	const id = `${Date.now()}-${Math.random()}-${buttonDescriptor.title}`;

	return (toolbarView: ToolbarView) => {
		const members = get(memberMap, toolbarsInstance);

		const toolbarViewDriver = toolbarView.getToolbarViewDriver();

		if(buttonDescriptor.hideFor){
			const routeView = members.membrane.get(toolbarViewDriver.getRouteViewDriver());
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
			const toolbarView = new ToolbarView(toolbarViewDriver);

			if (toolbarViewDriver.isForRowList()) {
				members.listButtonHandlerRegistry.addTarget(toolbarView);
			} else if (toolbarViewDriver.isForThread()) {
				members.threadViewHandlerRegistry.addTarget(toolbarView);
			}
		});
}

function _processButtonDescriptor(buttonDescriptor, members, toolbarViewDriver): Object {
	const {membrane} = members;
	const buttonOptions = Object.assign({}, buttonDescriptor);
	const oldOnClick = buttonOptions.onClick || function(){};

	buttonOptions.onClick = function(event) {
		event = event || {};

		if (toolbarViewDriver.isForRowList()) {
			const threadRowViewDrivers = Array.from(
				toolbarViewDriver
					.getThreadRowViewDrivers()
					.values()
			);

			const threadRowViews = threadRowViewDrivers
				.map(threadRowViewDriver => membrane.get(threadRowViewDriver));

			const selectedThreadRowViews = threadRowViewDrivers
				.filter(threadRowViewDriver => threadRowViewDriver.isSelected())
				.map(threadRowViewDriver => membrane.get(threadRowViewDriver));

			event = {...event, threadRowViews, selectedThreadRowViews};
		} else if (toolbarViewDriver.isForThread()) {
			const threadView = membrane.get(toolbarViewDriver.getThreadViewDriver());
			event = {...event, threadView};
		}

		oldOnClick(event);
	};

	return buttonOptions;
}
