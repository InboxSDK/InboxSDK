/* @flow */
// jshint ignore:start

export default {
	getLogger: 0,
	getRouteViewDriverStream: 0,
	getRowListViewDriverStream: 0,
	openComposeWindow: 0,
	getComposeViewDriverStream: 0,
	openDraftByMessageID: 1,
	getThreadViewDriverStream: 0,
	getMessageViewDriverStream: 0,
	createKeyboardShortcutHandle: 4,
	getUserEmailAddress: 0,
	getUserContact: 0,
	getThreadRowViewDriverKefirStream: 0,
	addNavItem: 2,
	getSentMailNativeNavItem: 0,
	createLink: 2,
	goto: 2,
	addCustomRouteID: 1,
	addCustomListRouteID: 2,
	showCustomRouteView: 1,
	setShowNativeNavMarker: 1,
	registerSearchSuggestionsProvider: 1,
	registerSearchQueryRewriter: 1,
	addToolbarButtonForApp: 1,
	getToolbarViewDriverStream: 0,
	getButterBarDriver: 0,
	setButterBar: 1,
	isRunningInPageContext: 0,
	showAppIdWarning: 0,
	createModalViewDriver: 1,
	destroy: 0
};

import type Bacon from 'baconjs';
import type GmailKeyboardShortcutHandle from '../dom-driver/gmail/views/gmail-keyboard-shortcut-handle';
type ShortcutDescriptor = {
	chord: string;
	description: string;
};
import type Logger from '../lib/logger';

// TODO fill in some of these any types
export type Driver = {
	onready: Promise<void>;
	getLogger(): Logger;
	getRouteViewDriverStream(): Bacon.Observable<any>;
	getRowListViewDriverStream(): Bacon.Observable<any>;
	openComposeWindow(): void;
	getComposeViewDriverStream(): Bacon.Observable<any>;
	openDraftByMessageID(messageID: string): void;
	getThreadViewDriverStream(): Bacon.Observable<any>;
	getMessageViewDriverStream(): Bacon.Observable<any>;
	createKeyboardShortcutHandle(shortcutDescriptor: ShortcutDescriptor, appId: string, appIconUrl: string): GmailKeyboardShortcutHandle;
	getUserEmailAddress(): string;
	getUserContact(): Contact;
	getThreadRowViewDriverKefirStream(): any;
	addNavItem(a: any, b: any): any;
	getSentMailNativeNavItem(): any;
	createLink(a: any, b: any): any;
	goto(routeID: string, params: any): void;
	addCustomRouteID(routeID: string): () => void;
	addCustomListRouteID(routeID: string, handler: Function): () => void;
	showCustomRouteView(a: any): any;
	setShowNativeNavMarker(a: any): any;
	registerSearchSuggestionsProvider(a: any): any;
	registerSearchQueryRewriter(a: any): any;
	addToolbarButtonForApp(a: any): any;
	getToolbarViewDriverStream(): Bacon.Observable<any>;
	getButterBarDriver(): any;
	setButterBar(butterBar: any): void;
	isRunningInPageContext(): boolean;
	showAppIdWarning(): void;
	createModalViewDriver(a: any): any;
	destroy(): void;
};
