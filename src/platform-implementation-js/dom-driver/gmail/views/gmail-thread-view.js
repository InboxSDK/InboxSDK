/* @flow */

import asap from 'asap';
import _ from 'lodash';
import {defn} from 'ud';
import util from 'util';
import Kefir from 'kefir';
import {parse} from 'querystring';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import delayAsap from '../../../lib/delay-asap';
import type GmailDriver from '../gmail-driver';
import GmailElementGetter from '../gmail-element-getter';
import GmailMessageView from './gmail-message-view';
import GmailToolbarView from './gmail-toolbar-view';
import GmailAppSidebarView from './gmail-app-sidebar-view';

class GmailThreadView {
	_element: HTMLElement;
	_routeViewDriver: any;
	_driver: GmailDriver;
	_isPreviewedThread: boolean;
	_eventStream: Bus<any>;
	_sidebar: ?GmailAppSidebarView = null;

	_toolbarView: any;
	_messageViewDrivers: any[];
	_newMessageMutationObserver: ?MutationObserver;
	_threadID: ?string;

	constructor(element: HTMLElement, routeViewDriver: any, driver: GmailDriver, isPreviewedThread:boolean=false) {
		this._element = element;
		this._routeViewDriver = routeViewDriver;
		this._driver = driver;
		this._isPreviewedThread = isPreviewedThread;

		this._eventStream = kefirBus();
		this._messageViewDrivers = [];

		this._setupToolbarView();
		asap(() => {
			// Don't emit anything before anyone has had a chance to start listening!
			this._setupMessageViewStream();
		});
	}

	getEventStream(): Kefir.Observable<Object> { return this._eventStream; }
	getElement(): HTMLElement { return this._element; }
	getRouteViewDriver(): any { return this._routeViewDriver; }
	getIsPreviewedThread(): boolean { return this._isPreviewedThread; }
	getToolbarView(): any { return this._toolbarView; }
	getMessageViewDrivers(): any[] { return this._messageViewDrivers; }

	destroy() {
		this._eventStream.end();
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

	addSidebarContentPanel(descriptor: Kefir.Observable<Object>, appId: string){
		const sidebarElement = GmailElementGetter.getSidebarContainerElement();
		if (!sidebarElement) {
			console.warn('This view does not have a sidebar');
			return;
		}
		let sidebar = this._sidebar;
		if (!sidebar) {
			sidebar = this._sidebar = new GmailAppSidebarView(this._driver, sidebarElement);
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
		if(this._threadID){
			return this._threadID;
		}

		if(this._isPreviewedThread){
			this._threadID = this._driver.getPageCommunicator().getCurrentThreadID(this._element, true);
		}
		else{
			var params = this._routeViewDriver ? this._routeViewDriver.getParams() : null;

			if(params && params.threadID){
				this._threadID = params.threadID;
			}
			else{
				this._threadID = this._driver.getPageCommunicator().getCurrentThreadID(this._element);
			}
		}

		if (!this._threadID) {
			// Happens if gmonkey isn't available, like on a standalone thread page.
			this._threadID = parse(document.location.search, null, null).th;
		}

		return this._threadID;
	}

	_setupToolbarView() {
		const toolbarElement = this._findToolbarElement();
		if (!toolbarElement) throw new Error("No toolbar element found");

		this._toolbarView = new GmailToolbarView(toolbarElement, this._routeViewDriver, this);
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

	getReadyStream() {
		return delayAsap(null);
	}
}

export default defn(module, GmailThreadView);
