/* @flow */
//jshint ignore:start

import type Kefir from 'kefir';
import type {EventEmitter} from 'events';
import type {TooltipDescriptor} from '../views/compose-button-view';

export type StatusBar = EventEmitter & {
	el: HTMLElement,
	destroy: () => void
};

export type ComposeButtonDescriptor = {
	title: string;
	iconUrl?: ?string;
	iconClass?: ?string;
	onClick: (event: Object) => void;
	hasDropdown?: ?boolean;
	type?: ?string;
	orderHint?: ?number;
	enabled?: ?boolean;
};

export type ComposeViewDriver = {
	destroy(): void;
	getEventStream(): Kefir.Observable<Object>;
	getStopper(): Kefir.Observable<any>;
	getElement(): HTMLElement;
	insertBodyTextAtCursor(text: string): ?HTMLElement;
	insertBodyHTMLAtCursor(html: string): ?HTMLElement;
	insertLinkIntoBody(text: string, href: string): ?HTMLElement;
	insertLinkChipIntoBody(options: {iconUrl?: string, url: string, text: string}): HTMLElement;
	setSubject(text: string): void;
	setBodyHTML(html: string): void;
	setBodyText(text: string): void;
	setToRecipients(emails: string[]): void;
	setCcRecipients(emails: string[]): void;
	setBccRecipients(emails: string[]): void;
	getFromContact(): Contact;
	getFromContactChoices(): Contact[];
	setFromEmail(email: string): void;
	focus(): void;
	close(): void;
	send(): void;
	popOut(): void;
	registerRequestModifier(modifier: Object): void;
	attachFiles(files: Blob[]): Promise<void>;
	attachInlineFiles(files: Blob[]): Promise<void>;
	isFullscreen(): boolean;
	setFullscreen(fullscreen: boolean): void;
	isMinimized(): boolean;
	setMinimized(minimized: boolean): void;
	addButton(buttonDescriptor: Kefir.Observable<?ComposeButtonDescriptor>, groupOrderHint: string, extraOnClickOptions: Object): Promise<?Object>;
	addRecipientRow(options: Kefir.Observable<?Object>): () => void;
	addOuterSidebar(options: {title: string, el: HTMLElement}): void;
	addInnerSidebar(options: {el: HTMLElement}): void;
	addStatusBar(options?: {height?: number, orderHint?: number}): StatusBar;
	isReply(): boolean;
	isInlineReplyForm(): boolean;
	getBodyElement(): HTMLElement;
	getHTMLContent(): string;
	getTextContent(): string;
	getSelectedBodyHTML(): ?string;
	getSelectedBodyText(): ?string;
	getSubject(): string;
	getToRecipients(): Contact[];
	getCcRecipients(): Contact[];
	getBccRecipients(): Contact[];
	getComposeID(): string;
	getInitialMessageID(): ?string;
	getMessageID(): ?string;
	getThreadID(): ?string;
	getCurrentDraftID(): Promise<?string>;
	getDraftID(): Promise<?string>;
	addTooltipToButton(buttonViewController: Object, buttonDescriptor: Object, tooltipDescriptor: TooltipDescriptor): void;
	closeButtonTooltip(buttonViewController: Object): void;
};
