/* @flow */
// jshint ignore:start

import type Kefir from 'kefir';
import type KeyboardShortcutHandle from '../views/keyboard-shortcut-handle';
import type Logger from '../lib/logger';
import type {ComposeViewDriver} from './compose-view-driver';

import type GmailBackdrop from '../dom-driver/gmail/views/gmail-backdrop';
import type InboxBackdrop from '../dom-driver/inbox/views/inbox-backdrop';
export type Backdrop = GmailBackdrop|InboxBackdrop;

export type DrawerViewOptions = {el: HTMLElement};
import type InboxDrawerView from '../dom-driver/inbox/views/inbox-drawer-view';
export type DrawerViewDriver = InboxDrawerView;

// TODO fill in some of these any types
export type Driver = {
	onready: Promise<void>;
	getLogger(): Logger;
	getRouteViewDriverStream(): Kefir.Stream<Object>; // should be a property
	getRowListViewDriverStream(): Kefir.Stream<Object>;
	openComposeWindow(): void;
	getComposeViewDriverStream(): Kefir.Stream<ComposeViewDriver>;
	openDraftByMessageID(messageID: string): void;
	getThreadViewDriverStream(): Kefir.Stream<Object>;
	getMessageViewDriverStream(): Kefir.Stream<Object>;
	activateShortcut(keyboardShortcutHandle: KeyboardShortcutHandle, appName: ?string, appIconUrl: ?string): void;
	getUserEmailAddress(): string;
	getUserContact(): Contact;
	getThreadRowViewDriverStream(): Kefir.Stream<Object>;
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
	addToolbarButtonForApp(buttonDescriptor: Kefir.Stream<Object>): Promise<Object>;
	getToolbarViewDriverStream(): Kefir.Stream<Object>;
	getButterBarDriver(): any;
	setButterBar(butterBar: any): void;
	isRunningInPageContext(): boolean;
	showAppIdWarning(): void;
	createModalViewDriver(options: Object): Object;
	createMoleViewDriver(options: Object): Object;
	createTopMessageBarDriver(options: Object): Object;
	createDrawerViewDriver(options: DrawerViewOptions): DrawerViewDriver;
	createBackdrop(): Backdrop;
	getStopper(): Kefir.Stream;
	destroy(): void;
};
