/* @flow */

import constant from 'lodash/constant';
import asap from 'asap';
import delay from 'pdelay';
import {defn} from 'ud';
import util from 'util';
import Kefir from 'kefir';
import {parse} from 'querystring';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type {Bus} from 'kefir-bus';

import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import simulateClick from '../../../lib/dom/simulate-click';

import delayAsap from '../../../lib/delay-asap';
import type GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import GmailMessageView from './gmail-message-view';
import GmailToolbarView from './gmail-toolbar-view';
import GmailAppSidebarView from './gmail-app-sidebar-view';
import WidthManager from './gmail-thread-view/width-manager';

let hasLoggedAddonInfo = false;

class GmailThreadView {
	_element: HTMLElement;
	_routeViewDriver: any;
	_driver: GmailDriver;
	_isPreviewedThread: boolean;
	_eventStream: Bus<any>;
	_stopper = kefirStopper();
	_sidebar: ?GmailAppSidebarView = null;
	_widthManager: ?WidthManager = null;

	_toolbarView: any;
	_messageViewDrivers: any[];
	_newMessageMutationObserver: ?MutationObserver;
	_readyStream: Kefir.Observable<any>;
	_threadID: ?string;
	_syncThreadID: ?string;

	constructor(element: HTMLElement, routeViewDriver: any, driver: GmailDriver, isPreviewedThread:boolean=false) {
		this._element = element;
		this._routeViewDriver = routeViewDriver;
		this._driver = driver;
		this._isPreviewedThread = isPreviewedThread;

		this._eventStream = kefirBus();
		this._messageViewDrivers = [];

		const suppressAddonTitle = driver.getOpts().suppressAddonTitle;
		if(suppressAddonTitle) this._waitForAddonTitleAndSuppress(suppressAddonTitle);
		this._logAddonElementInfo().catch(err => this._driver.getLogger().error(err));

		if(driver.getOpts().REQUESTED_API_VERSION === 1 && driver.isUsingSyncAPI()){
			this._readyStream =
				Kefir.fromPromise(this.getThreadIDAsync())
					.map(() => {
						this._setupToolbarView();
						this._setupMessageViewStream();
						return null;
					});
		}
		else {
			this._readyStream = Kefir.constant(null);
			this._setupToolbarView();
			this._setupMessageViewStream();
		}
	}

	// TODO use livesets eventually
	getMessageViewDriverStream(): Kefir.Observable<GmailMessageView> {
		return Kefir.constant(this._messageViewDrivers).flatten()
			.merge(
				this._eventStream.filter(event =>
					event.type === 'internal' && event.eventName === 'messageCreated'
				).map(event => event.view)
			);
	}

	isLoadingStub() {
		return false;
	}
	getStopper() { return this._stopper; }
	getEventStream(): Kefir.Observable<Object> { return this._eventStream; }
	getElement(): HTMLElement { return this._element; }
	getRouteViewDriver(): any { return this._routeViewDriver; }
	getIsPreviewedThread(): boolean { return this._isPreviewedThread; }
	getToolbarView(): any { return this._toolbarView; }
	getMessageViewDrivers(): GmailMessageView[] { return this._messageViewDrivers; }

	destroy() {
		this._eventStream.end();
		this._stopper.destroy();
		this._toolbarView.destroy();
		if (this._sidebar) this._sidebar.destroy();

		this._messageViewDrivers.forEach(messageView => {
			messageView.destroy();
		});
		this._messageViewDrivers.length = 0;
		if (this._newMessageMutationObserver) {
			this._newMessageMutationObserver.disconnect();
		}
	}

	addSidebarContentPanel(descriptor: Kefir.Observable<Object>){
		const sidebarElement = GmailElementGetter.getSidebarContainerElement();
		const addonSidebarElement = GmailElementGetter.getAddonSidebarContainerElement();
		if (!sidebarElement && !addonSidebarElement) {
			console.warn('This view does not have a sidebar'); //eslint-disable-line no-console
			return;
		}
		let sidebar = this._sidebar;
		if (!sidebar) {
			let widthManager;
			if(addonSidebarElement){
				widthManager = this._setupWidthManager();
			}
			sidebar = this._sidebar = new GmailAppSidebarView(this._driver, sidebarElement, addonSidebarElement, widthManager);
			sidebar.getStopper().onValue(() => {
				if (this._sidebar === sidebar) {
					this._sidebar = null;
				}
			});
		}
		return sidebar.addSidebarContentPanel(descriptor);
	}

	getSubject(): string {
		var subjectElement = this._element.querySelector('.ha h2');
		if(!subjectElement){
			return "";
		}
		else{
			return subjectElement.textContent;
		}
	}

	getThreadID(): string {
		if(this._threadID) return this._threadID;

		let threadID;
		if(this._isPreviewedThread){
			threadID = this._driver.getPageCommunicator().getCurrentThreadID(this._element, true);
		}
		else{
			const params = this._routeViewDriver ? this._routeViewDriver.getParams() : null;

			if(params && params.threadID){
				threadID = params.threadID;
			} else {
				const err = new Error('Failed to get id for thread');
				this._driver.getLogger().error(err);
				throw err;
			}
		}

		this._threadID = threadID;
		return threadID;
	}

	async getThreadIDAsync(): Promise<string> {
		let threadID;
		if(this._isPreviewedThread){
			threadID = this._driver.getPageCommunicator().getCurrentThreadID(this._element, true);
		}
		else{
			const params = this._routeViewDriver ? this._routeViewDriver.getParams() : null;

			if(params && params.threadID){
				threadID = params.threadID;
			} else {
				const err = new Error('Failed to get id for thread');
				this._driver.getLogger().error(err);
				throw err;
			}
		}

		if(this._driver.isUsingSyncAPI() && !this._isPreviewedThread){
			this._syncThreadID = threadID;
			this._threadID = await this._driver.getOldGmailThreadIdFromSyncThreadId(threadID);
		}
		else{
			this._threadID = threadID;
		}

		if(this._threadID) return this._threadID;
		else throw new Error('Failed to get id for thread');
	}

	_setupToolbarView() {
		const toolbarElement = this._findToolbarElement();
		if (!toolbarElement) throw new Error("No toolbar element found");
		const toolbarParent = toolbarElement.parentElement;
		if(toolbarParent) toolbarParent.classList.add('inboxsdk__thread_toolbar_parent');

		this._toolbarView = new GmailToolbarView(toolbarElement, this._driver, this._routeViewDriver, this);
	}

	_findToolbarElement(): ?HTMLElement {
		var toolbarContainerElements = document.querySelectorAll('[gh=tm]');
		for(var ii=0; ii<toolbarContainerElements.length; ii++){
			if(this._isToolbarContainerRelevant(toolbarContainerElements[ii])){
				return toolbarContainerElements[ii].querySelector('[gh=mtb]');
			}
		}

		return null;
	}

	_isToolbarContainerRelevant(toolbarContainerElement: HTMLElement): boolean {
		if((toolbarContainerElement:any).parentElement.parentElement === (this._element:any).parentElement.parentElement){
			return true;
		}

		if((toolbarContainerElement:any).parentElement.getAttribute('role') !== 'main' && (this._element:any).parentElement.getAttribute('role') !== 'main'){
			return true;
		}

		if((toolbarContainerElement:any).parentElement.getAttribute('role') === 'main' && (toolbarContainerElement:any).parentElement.querySelector('.if') && (toolbarContainerElement:any).parentElement.querySelector('.if').parentElement === this._element){
			return true;
		}

		return false;
	}

	_setupMessageViewStream() {
		var openMessage = this._element.querySelector('.h7');

		if(!openMessage){
			var self = this;
			setTimeout(function(){
				if (self._element) {
					self._setupMessageViewStream();
				}
			}, 500);
			return;
		}

		var messageContainer: HTMLElement = (openMessage.parentElement: any);

		this._initializeExistingMessages(messageContainer);
		this._observeNewMessages(messageContainer);
	}

	_initializeExistingMessages(messageContainer: any) {
		var self = this;
		var children = messageContainer.children;
		Array.prototype.forEach.call(children, function(childElement){
			self._createMessageView(childElement);
		});
	}

	_observeNewMessages(messageContainer: any) {
		this._newMessageMutationObserver = (new MutationObserver(this._handleNewMessageMutations.bind(this)): any);
		this._newMessageMutationObserver.observe(
			messageContainer,
			{childList: true}
		);
	}

	_handleNewMessageMutations(mutations: MutationRecord[]){
		var self = this;
		mutations.forEach(function(mutation){
			Array.prototype.forEach.call(mutation.addedNodes, function(addedNode){
				self._createMessageView(addedNode);
			});
		});
	}

	_createMessageView(messageElement: HTMLElement) {
		var messageView = new GmailMessageView(messageElement, this, this._driver);

		this._eventStream.plug(messageView.getEventStream());

		this._messageViewDrivers.push(messageView);
		this._eventStream.emit({
			type: 'internal',
			eventName: 'messageCreated',
			view: messageView
		});
	}

	_waitForAddonTitleAndSuppress(addonTitle: string){
		const addonSidebarElement = GmailElementGetter.getAddonSidebarContainerElement();
		if(!addonSidebarElement) return;

		const widthManager = this._setupWidthManager();

		makeElementChildStream(querySelector(addonSidebarElement, '.J-KU-Jg'))
			.filter(({el}) =>
					el.getAttribute('role') === 'tab' &&
					el.getAttribute('data-tooltip') === addonTitle
			)
			.takeUntilBy(this._stopper)
			.onValue(({el}) => {
				if(el.classList.contains('.J-KU-KO')){
					// it is currently open, so let's close
					simulateClick(el);
				}

				el.style.display = 'none';
				widthManager.fixWidths();
			});
	}

	_setupWidthManager(){
		let widthManager = this._widthManager;
		if(!widthManager){
			const addonSidebarElement = GmailElementGetter.getAddonSidebarContainerElement();
			if(!addonSidebarElement) throw new Error('addonSidebarElement not found');

			const mainContentBodyContainerElement = GmailElementGetter.getMainContentBodyContainerElement();
      if(!mainContentBodyContainerElement) throw new Error('mainContentBodyContainerElement not found');
			const contentContainer = mainContentBodyContainerElement.parentElement;
			if(!contentContainer) throw new Error('mainContentBodyContainerElement has no parent element');

			this._widthManager = widthManager = new WidthManager((contentContainer: any), addonSidebarElement);
		}

		return widthManager;
	}

	getReadyStream() {
		return this._readyStream;
	}

	async _logAddonElementInfo() {
		if (hasLoggedAddonInfo) return;

		function readInfo() {
			const container = GmailElementGetter.getAddonSidebarContainerElement();
			if (!container) return null;

			const isDisplayNone = {
				parent: container.parentElement ? (container.parentElement:any).style.display === 'none' : null,
				self: container.style.display === 'none',
				children: Array.from(container.children).map(el => el.style ? el.style.display === 'none' : null)
			};

			const rect = container.getBoundingClientRect();
			const size = {
				width: rect.width,
				height: rect.height
			};
			return {isDisplayNone, size};
		}

		const eventData = {time: {}};
		eventData.time[0] = readInfo();

		await Promise.all([30, 5000].map(async time => {
			await delay(time);
			if (this._stopper.stopped) return;
			eventData.time[time] = readInfo();
		}));
		if (this._stopper.stopped) return;

		this._driver.getLogger().eventSdkPassive('gmailSidebarElementInfo', eventData);

		hasLoggedAddonInfo = true;
	}
}

export default defn(module, GmailThreadView);
