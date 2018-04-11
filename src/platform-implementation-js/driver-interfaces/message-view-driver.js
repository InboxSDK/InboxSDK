/* @flow */

import Kefir from 'kefir';
import type {AttachmentCardViewDriver} from './driver';

export type VIEW_STATE = 'HIDDEN'|'COLLAPSED'|'EXPANDED';

export type MessageViewLinkDescriptor = {
	text: string;
	html: string;
	element: HTMLElement;
	href: string;
	isInQuotedArea: boolean;
};

export type MessageViewToolbarButtonDescriptor = {
	section: 'MORE';
	title: string;
	iconUrl?: ?string;
	iconClass?: ?string;
	onClick(): void;
	orderHint?: ?number;
};

export type MessageViewDriver = {
	getMessageID(): string;
	getMessageIDAsync(): Promise<string>;
	getContentsElement(): HTMLElement;
	isElementInQuotedArea(el: HTMLElement): boolean;
	addMoreMenuItem(options: MessageViewToolbarButtonDescriptor): void;
	addAttachmentIcon(options: Object): void;
	getAttachmentCardViewDrivers(): Array<AttachmentCardViewDriver>;
	addAttachmentCard(options: Object): AttachmentCardViewDriver;
	addButtonToDownloadAllArea(options: Object): void;
	getEventStream(): Kefir.Observable<Object>;
	getViewState(): VIEW_STATE;
	getDateString(): string;
	getSender(): Contact;
	getReadyStream(): Kefir.Observable<any>;
	getRecipients(): Array<Contact>;
	getRecipientsAsync(): Promise<Array<Contact>>;
	getThreadViewDriver(): Object;
	isLoaded(): boolean;
	hasOpenReply(): boolean;
};
