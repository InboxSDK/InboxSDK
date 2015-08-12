/* @flow */
//jshint ignore:start

import type Kefir from 'kefir';
import type {EventEmitter} from 'events';

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
	getEventStream(): Kefir.Stream;
	getStopper(): Kefir.Stream;
	getElement(): HTMLElement;
	insertBodyTextAtCursor(text: string): ?HTMLElement;
	insertBodyHTMLAtCursor(html: string): ?HTMLElement;
	insertLinkIntoBody(text: string, href: string): ?HTMLElement;
	setSubject(text: string): void;
	setBodyHTML(html: string): void;
	setBodyText(text: string): void;
	setToRecipients(emails: string[]): void;
	setCcRecipients(emails: string[]): void;
	setBccRecipients(emails: string[]): void;
	close(): void;
	send(): void;
	addButton(buttonDescriptor: Kefir.Stream<?ComposeButtonDescriptor>, groupOrderHint: string, extraOnClickOptions?: Object): Promise<?Object>;
	addRecipientRow(options: Kefir.Stream): () => void;
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
};
