/* @flow */

import _ from 'lodash';
import BasicClass from '../lib/basic-class';
import type Bacon from 'baconjs';

var MessageViewDriverObj = function(){
	BasicClass.call(this);
};

MessageViewDriverObj.prototype = Object.create(BasicClass.prototype);

_.extend(MessageViewDriverObj.prototype, {
	getContentsElement: null,
	getLinks: null,
	isElementInQuotedArea: null,
	getAttachmentCardViewDrivers: null,
	addAttachmentCard: null,
	addButtonToDownloadAllArea: null,
	getEventStream: null
});

export type VIEW_STATE = 'HIDDEN'|'COLLAPSED'|'EXPANDED';

export type MessageViewLinkDescriptor = {
	text: string;
	html: string;
	element: HTMLElement;
	href: string;
	isInQuotedArea: boolean;
};

export type MessageViewDriver = {
	getMessageID(): string;
	getBodyElement(): HTMLElement;
	getContentsElement(): HTMLElement;
	getLinks(): Array<MessageViewLinkDescriptor>;
	isElementInQuotedArea(el: HTMLElement): boolean;
	addAttachmentIcon(options: Object): void;
	getAttachmentCardViewDrivers(): Array<Object>;
	addAttachmentCard(options: Object): Object;
	addAttachmentCardNoPreview(options: Object): Object;
	addButtonToDownloadAllArea(options: Object): void;
	getEventStream(): Bacon.Observable;
	getViewState(): VIEW_STATE;
	getDateString(): string;
	getSender(): Contact;
	getRecipients(): Array<Contact>;
	getThreadViewDriver(): Object;
	isLoaded(): boolean;
};

export default MessageViewDriverObj;
