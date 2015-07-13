/* @flow */
//jshint ignore:start

import type Bacon from 'baconjs';
import type {EventEmitter} from 'events';

export type StatusBar = EventEmitter & {
	el: HTMLElement,
	destroy: () => void
};

export type ComposeViewDriver = {
	insertBodyTextAtCursor(text: string): ?HTMLElement;
	insertBodyHTMLAtCursor(text: string): ?HTMLElement;
	insertLinkIntoBody(text: string, href: string): ?HTMLElement;

	setSubject(text: string): void;
	setBodyHTML(text: string): void;
	setBodyText(text: string): void;
	setToRecipients(emails: string[]): void;
	setCcRecipients(emails: string[]): void;
	setBccRecipients(emails: string[]): void;
	close(): void;
	addButton(buttonDescriptor: Bacon.Observable, groupOrderHint: string, extraOnClickOptions?: Object): Promise<?Object>;
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
	getEventStream(): Bacon.Observable;
	destroy(): void;
};
