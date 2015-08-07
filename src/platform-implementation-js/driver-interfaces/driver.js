/* @flow */
// jshint ignore:start

import type Bacon from 'baconjs';
import type Kefir from 'kefir';
import type GmailKeyboardShortcutHandle from '../dom-driver/gmail/views/gmail-keyboard-shortcut-handle';
export type ShortcutDescriptor = {
	chord: string;
	description: string;
};
import type Logger from '../lib/logger';
import type {ComposeViewDriver} from './compose-view-driver';

// TODO fill in some of these any types
export type Driver = {
	onready: Promise<void>;
	getLogger(): Logger;
	getRouteViewDriverStream(): Bacon.Observable<Object>;
	getRowListViewDriverStream(): Bacon.Observable<Object>;
	openComposeWindow(): void;
	getComposeViewDriverStream(): Bacon.Observable<ComposeViewDriver>;
	openDraftByMessageID(messageID: string): void;
	getThreadViewDriverStream(): Bacon.Observable<Object>;
	getMessageViewDriverStream(): Bacon.Observable<Object>;
	createKeyboardShortcutHandle(shortcutDescriptor: ShortcutDescriptor, appId: string, appIconUrl: ?string): GmailKeyboardShortcutHandle;
	getUserEmailAddress(): string;
	getUserContact(): Contact;
	getThreadRowViewDriverKefirStream(): Kefir.Stream<Object>;
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
	addToolbarButtonForApp(buttonDescriptor: Object): Promise<Object>;
	getToolbarViewDriverStream(): Bacon.Observable<Object>;
	getButterBarDriver(): any;
	setButterBar(butterBar: any): void;
	isRunningInPageContext(): boolean;
	showAppIdWarning(): void;
	createModalViewDriver(options: Object): Object;
	createMoleViewDriver(options: Object): Object;
	getStopper(): Kefir.Stream;
	destroy(): void;
};
