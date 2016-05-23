/* @flow */

import _ from 'lodash';
import {defn, defonce} from 'ud';
import EventEmitter from '../../lib/safe-event-emitter';

import AttachmentCardView from './attachment-card-view';
import {MessageViewToolbarSectionNames} from '../../platform-implementation/conversations';
import type ThreadView from './thread-view';
import type {
	MessageViewDriver, VIEW_STATE, MessageViewLinkDescriptor,
	MessageViewToolbarButtonDescriptor
} from '../../driver-interfaces/message-view-driver';
import type {Driver} from '../../driver-interfaces/driver';

const memberMap = defonce(module, () => new WeakMap());

// documented in src/docs/
class MessageView extends EventEmitter {
	destroyed: boolean = false;

	constructor(messageViewImplementation: MessageViewDriver, appId: string, membraneMap: WeakMap, Conversations: Object, driver: Driver){
		super();

		const members = {messageViewImplementation, membraneMap, Conversations, driver};
		memberMap.set(this, members);

		_bindToEventStream(this, members, messageViewImplementation.getEventStream());
	}

	addAttachmentCardView(cardOptions: Object): AttachmentCardView {
		var attachmentCardViewDriver = memberMap.get(this).messageViewImplementation.addAttachmentCard(cardOptions);
		var attachmentCardView = new AttachmentCardView(attachmentCardViewDriver, this);

		return attachmentCardView;
	}

	addAttachmentCardViewNoPreview(cardOptions: Object): AttachmentCardView {
		var attachmentCardViewDriver = memberMap.get(this).messageViewImplementation.addAttachmentCardNoPreview(cardOptions);
		var attachmentCardView = new AttachmentCardView(attachmentCardViewDriver, this);

		return attachmentCardView;
	}

	addAttachmentsToolbarButton(buttonOptions: Object){
		const {messageViewImplementation} = memberMap.get(this);
		messageViewImplementation.addButtonToDownloadAllArea({
			tooltip: buttonOptions.tooltip,
			iconUrl: buttonOptions.iconUrl,
			onClick: () => {
				const attachmentCardViews = messageViewImplementation.getAttachmentCardViewDrivers().map(cardDriver =>
					new AttachmentCardView(cardDriver, this)
				);
				buttonOptions.onClick({attachmentCardViews});
			}
		});
	}

	addToolbarButton(buttonOptions: MessageViewToolbarButtonDescriptor) {
		if (
			typeof buttonOptions.onClick !== 'function' ||
			typeof buttonOptions.title !== 'string' ||
			!MessageViewToolbarSectionNames.hasOwnProperty(buttonOptions.section)
		) {
			throw new Error("Missing required properties on MessageViewToolbarButtonDescriptor object");
		}
		const {messageViewImplementation} = memberMap.get(this);
		messageViewImplementation.addMoreMenuItem(buttonOptions);
	}

	getBodyElement(): HTMLElement {
		return memberMap.get(this).messageViewImplementation.getContentsElement();
	}

	getMessageID(): string {
		return memberMap.get(this).messageViewImplementation.getMessageID();
	}

	// TODO non-file-attachment card views are asynchronously loaded. Add some sort of
	// registerAttachmentCardViewHandler function to listen for other types of
	// attachment cards.
	getFileAttachmentCardViews(): Array<AttachmentCardView> {
		var self = this;
		return _.chain(memberMap.get(this).messageViewImplementation.getAttachmentCardViewDrivers())
			.filter(function(cardDriver) {
				return cardDriver.getAttachmentType() === 'FILE';
			})
			.map(function(attachmentCardViewDriver){
				return new AttachmentCardView(attachmentCardViewDriver, self);
			})
			.value();
	}

	// Deprecated name
	getAttachmentCardViews(): Array<AttachmentCardView> {
		memberMap.get(this).driver.getLogger().deprecationWarning('MessageView.getAttachmentCardViews', 'MessageView.getFileAttachmentCardViews');
		return this.getFileAttachmentCardViews();
	}

	isElementInQuotedArea(element: HTMLElement): boolean {
		return memberMap.get(this).messageViewImplementation.isElementInQuotedArea(element);
	}

	isLoaded(): boolean {
		return memberMap.get(this).messageViewImplementation.isLoaded();
	}

	getLinksInBody(): Array<MessageViewLinkDescriptor> {
		return memberMap.get(this).messageViewImplementation.getLinks();
	}

	getSender(): Contact {
		return memberMap.get(this).messageViewImplementation.getSender();
	}

	getRecipients(): Array<Contact> {
		return memberMap.get(this).messageViewImplementation.getRecipients();
	}

	getThreadView(): ThreadView {
		var members = memberMap.get(this);
		return members.membraneMap.get(members.messageViewImplementation.getThreadViewDriver());
	}

	getDateString(): string {
		return memberMap.get(this).messageViewImplementation.getDateString();
	}

	addAttachmentIcon(iconDescriptor: Object) {
		memberMap.get(this).messageViewImplementation.addAttachmentIcon(iconDescriptor);
	}

	getViewState(): VIEW_STATE {
		var members = memberMap.get(this);
		return members.Conversations.MessageViewViewStates[members.messageViewImplementation.getViewState()];
	}

	hasOpenReply(): boolean {
		return memberMap.get(this).messageViewImplementation.hasOpenReply();
	}
}


function _bindToEventStream(messageView, members, stream){
	stream.onEnd(function(){
		messageView.destroyed = true;
		messageView.emit('destroy');

		messageView.removeAllListeners();
	});

	stream
		.filter(function(event){
			return event.type !== 'internal' && event.eventName === 'contactHover';
		})
		.onValue(function(event){
			messageView.emit(event.eventName, {
				contactType: event.contactType,
				contact: event.contact,
				messageView: messageView,
				threadView: messageView.getThreadView()
			});
		});

	stream
		.filter(function(event){
			return event.eventName === 'messageLoad';
		})
		.onValue(function(event){
			messageView.emit('load', {
				messageView: messageView
			});
		});

	stream
		.filter(function(event){
			return event.eventName === 'viewStateChange';
		})
		.onValue(function(event){
			messageView.emit('viewStateChange', {
				oldViewState: members.Conversations.MessageViewViewStates[event.oldValue],
				newViewState: members.Conversations.MessageViewViewStates[event.newValue],
				messageView: messageView
			});
		});
}

export default defn(module, MessageView);
