/* @flow */
// jshint ignore:start

import type Kefir from 'kefir';
import type KeyboardShortcutHandle from '../views/keyboard-shortcut-handle';
import type Logger from '../lib/logger';
import type {ComposeViewDriver} from './compose-view-driver';
import type ComposeView from '../views/compose-view';
import type {RouteViewDriver} from './route-view-driver';

import type GmailBackdrop from '../dom-driver/gmail/views/gmail-backdrop';
import type InboxBackdrop from '../dom-driver/inbox/views/inbox-backdrop';
export type Backdrop = GmailBackdrop|InboxBackdrop;

import type GmailThreadView from '../dom-driver/gmail/views/gmail-thread-view';
import type InboxThreadView from '../dom-driver/inbox/views/inbox-thread-view';
export type ThreadViewDriver = GmailThreadView|InboxThreadView;

import type {MessageViewDriver} from './message-view-driver';

import type GmailAttachmentCardView from '../dom-driver/gmail/views/gmail-attachment-card-view';
import type InboxAttachmentCardView from '../dom-driver/inbox/views/inbox-attachment-card-view';
export type AttachmentCardViewDriver = GmailAttachmentCardView|InboxAttachmentCardView;

export type DrawerViewOptions = {
	el: HTMLElement;
	title?: string;
	chrome?: boolean;
	composeView?: ComposeView;
	closeWithCompose?: boolean;
};
import type InboxDrawerView from '../dom-driver/inbox/views/inbox-drawer-view';
export type DrawerViewDriver = InboxDrawerView;

// TODO fill in some of these any types
export type Driver = {
	onready: Promise<void>;
	getLogger(): Logger;
	getAppId(): string;
	getRouteViewDriverStream(): Kefir.Observable<RouteViewDriver>; // should be a property
	getRowListViewDriverStream(): Kefir.Observable<Object>;
	openComposeWindow(): void;
	getComposeViewDriverStream(): Kefir.Observable<ComposeViewDriver>;
	openDraftByMessageID(messageID: string): void;
	getThreadViewDriverStream(): Kefir.Observable<ThreadViewDriver>;
	getMessageViewDriverStream(): Kefir.Observable<MessageViewDriver>;
	getAttachmentCardViewDriverStream(): Kefir.Observable<AttachmentCardViewDriver>;
	activateShortcut(keyboardShortcutHandle: KeyboardShortcutHandle, appName: ?string, appIconUrl: ?string): void;
	getUserEmailAddress(): string;
	getUserContact(): Contact;
	getAccountSwitcherContactList(): Contact[];
	getThreadRowViewDriverStream(): Kefir.Observable<Object>;
	addNavItem(appId: string, navItemDescriptor: Object): Object;
	getSentMailNativeNavItem(): Promise<Object>;
	createLink(a: any, b: any): any;
	goto(routeID: string, params: any): void;
	addCustomRouteID(routeID: string): () => void;
	addCustomListRouteID(routeID: string, handler: Function): () => void;
	showCustomRouteView(a: any): any;
	setShowNativeNavMarker(a: any): any;
	registerSearchSuggestionsProvider(handler: Function): void;
	registerSearchQueryRewriter(obj: Object): void;
	addToolbarButtonForApp(buttonDescriptor: Kefir.Observable<Object>): Promise<Object>;
	getToolbarViewDriverStream(): Kefir.Observable<Object>;
	getButterBarDriver(): any;
	setButterBar(butterBar: any): void;
	isRunningInPageContext(): boolean;
	showAppIdWarning(): void;
	createModalViewDriver(options: Object): Object;
	createMoleViewDriver(options: Object): Object;
	createTopMessageBarDriver(options: Object): Object;
	createDrawerViewDriver(options: DrawerViewOptions): DrawerViewDriver;
	createBackdrop(zIndex?: number, target?: HTMLElement): Backdrop;
	getStopper(): Kefir.Observable<any>;
	destroy(): void;
};
