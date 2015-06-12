/* @flow */
// jshint ignore:start

import _ from 'lodash';
import util from 'util';
import Bacon from 'baconjs';

import GmailElementGetter from '../gmail-element-getter';

import GmailMessageView from './gmail-message-view';
import GmailToolbarView from './gmail-toolbar-view';

import GmailContentPanelContainerView from '../widgets/gmail-content-panel/gmail-content-panel-container-view';

class GmailThreadView {
	_element: HTMLElement;
	_routeViewDriver: any;
	_driver: any;
	_isPreviewedThread: boolean;
	_eventStream: Bacon.Bus;
	_sidebarContentPanelContainerView: any;
	_toolbarView: any;
	_messageViewDrivers: any[];
	_pageCommunicator: any;
	_newMessageMutationObserver: sdkMutationObserver;
	_threadID: ?string;

	constructor(element: HTMLElement, routeViewDriver: any, driver: any, isPreviewedThread:boolean=false) {
		this._element = element;
		this._routeViewDriver = routeViewDriver;
		this._driver = driver;
		this._isPreviewedThread = isPreviewedThread;

		this._eventStream = new Bacon.Bus();
		this._messageViewDrivers = [];

		this._setupToolbarView();
		this._setupMessageViewStream();
	}

	getEventStream(): Bacon.Observable { return this._eventStream; }
	getElement(): HTMLElement { return this._element; }
	getRouteViewDriver(): any { return this._routeViewDriver; }
	getIsPreviewedThread(): boolean { return this._isPreviewedThread; }
	getSidebarContentPanelContainerView(): any { return this._sidebarContentPanelContainerView; }
	getToolbarView(): any { return this._toolbarView; }
	getMessageViewDrivers(): any[] { return this._messageViewDrivers; }

	destroy() {
		this._newMessageMutationObserver.disconnect();
		this._eventStream.end();
		this._toolbarView.destroy();
		this._sidebarContentPanelContainerView.destroy();
	}

	setPageCommunicator(pc: any) {
		this._pageCommunicator = pc;
	}

	addSidebarContentPanel(descriptor: any, appId: string){
		if(!this._sidebarContentPanelContainerView){
			var sidebarElement = GmailElementGetter.getSidebarContainerElement();

			if(!sidebarElement){
				console.warn('This view does not have a sidebar');
				return;
			}
			else{
				this._setupSidebarView(sidebarElement);
			}
		}

		return this._sidebarContentPanelContainerView.addContentPanel(descriptor, appId);
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
			this._threadID = this._pageCommunicator.getCurrentThreadID(this._element, true);
		}
		else{
			var params = this._routeViewDriver ? this._routeViewDriver.getParams() : null;

			if(params && params.threadID){
				this._threadID = params.threadID;
			}
			else{
				this._threadID = this._pageCommunicator.getCurrentThreadID(this._element);
			}
		}

		return (this._threadID: any);
	}

	_setupToolbarView() {
		var toolbarElement = this._findToolbarElement();

		this._toolbarView = new GmailToolbarView(toolbarElement, this._routeViewDriver);
		this._toolbarView.setThreadViewDriver(this);
	}

	_setupSidebarView(sidebarElement: HTMLElement) {
		var existingContentPanelContainer = sidebarElement.querySelector('.inboxsdk__contentPanelContainer');
		this._sidebarContentPanelContainerView = new GmailContentPanelContainerView(existingContentPanelContainer);

		if(!existingContentPanelContainer){
			sidebarElement.classList.add('inboxsdk__sidebar');
			sidebarElement.insertBefore(this._sidebarContentPanelContainerView.getElement(), (sidebarElement.firstElementChild: any));
		}
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

		var messageContainer: HTMLElement = (openMessage: any).parentElement;

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
	}
}

export default GmailThreadView;
