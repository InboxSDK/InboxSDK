/* @flow */

import _ from 'lodash';
import {defn, defonce} from 'ud';
import asap from 'asap';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import get from '../../../common/get-or-fail';
import AttachmentCardView from './attachment-card-view';
import {MessageViewToolbarSectionNames} from '../../namespaces/conversations';
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

	constructor(messageViewImplementation: MessageViewDriver, appId: string, membrane: Membrane, Conversations: Object, driver: Driver){
		super();

		const members = {messageViewImplementation, membrane, Conversations, driver, linksInBody: null};
		memberMap.set(this, members);

		_bindToEventStream(this, members, messageViewImplementation.getEventStream());
	}

	addAttachmentCardView(cardOptions: Object): AttachmentCardView {
		const {messageViewImplementation, membrane} = get(memberMap, this);
		const attachmentCardViewDriver = messageViewImplementation.addAttachmentCard(cardOptions);
		const attachmentCardView = membrane.get(attachmentCardViewDriver);

		attachmentCardViewDriver.getPreviewClicks().onValue(e => {
			if (cardOptions.previewOnClick) {
				cardOptions.previewOnClick({
					attachmentCardView,
					preventDefault: () => e.preventDefault()
				});
			}
		});

		return attachmentCardView;
	}

	addAttachmentCardViewNoPreview(cardOptions) {
		return this.addAttachmentCardView(cardOptions);
	}

	addAttachmentsToolbarButton(buttonOptions: Object){
		const {messageViewImplementation, membrane} = get(memberMap, this);
		messageViewImplementation.addButtonToDownloadAllArea({
			tooltip: buttonOptions.tooltip,
			iconUrl: buttonOptions.iconUrl,
			onClick: () => {
				const attachmentCardViews = messageViewImplementation.getAttachmentCardViewDrivers().map(cardDriver =>
					membrane.get(cardDriver)
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
		const {messageViewImplementation} = get(memberMap, this);
		messageViewImplementation.addMoreMenuItem(buttonOptions);
	}

	getBodyElement(): HTMLElement {
		return get(memberMap, this).messageViewImplementation.getContentsElement();
	}

	getMessageID(): string {
		return get(memberMap, this).messageViewImplementation.getMessageID();
	}

	// TODO non-file-attachment card views are asynchronously loaded. Add some sort of
	// registerAttachmentCardViewHandler function to listen for other types of
	// attachment cards.
	getFileAttachmentCardViews(): Array<AttachmentCardView> {
		const {messageViewImplementation, membrane} = get(memberMap, this);
		return _.chain(messageViewImplementation.getAttachmentCardViewDrivers())
			.filter(cardDriver => cardDriver.getAttachmentType() === 'FILE')
			.map(attachmentCardViewDriver => membrane.get(attachmentCardViewDriver))
			.value();
	}

	// Deprecated name
	getAttachmentCardViews(): Array<AttachmentCardView> {
		get(memberMap, this).driver.getLogger().deprecationWarning('MessageView.getAttachmentCardViews', 'MessageView.getFileAttachmentCardViews');
		return this.getFileAttachmentCardViews();
	}

	isElementInQuotedArea(element: HTMLElement): boolean {
		return get(memberMap, this).messageViewImplementation.isElementInQuotedArea(element);
	}

	isLoaded(): boolean {
		return get(memberMap, this).messageViewImplementation.isLoaded();
	}

	getLinksInBody(): Array<MessageViewLinkDescriptor> {
		const members = get(memberMap, this);
		if(!members.linksInBody){
			const anchors = this.getBodyElement().querySelectorAll('a');
			members.linksInBody = _.map(anchors, anchor => ({
				text: anchor.textContent,
				html: anchor.innerHTML,
				href: anchor.href,
				element: anchor,
				isInQuotedArea: this.isElementInQuotedArea(anchor)
			}));
		}

		return members.linksInBody;
	}

	getSender(): Contact {
		return get(memberMap, this).messageViewImplementation.getSender();
	}

	getRecipients(): Array<Contact> {
		return get(memberMap, this).messageViewImplementation.getRecipients();
	}

	getThreadView(): ThreadView {
		const {messageViewImplementation, membrane} = get(memberMap, this);
		return membrane.get(messageViewImplementation.getThreadViewDriver());
	}

	getDateString(): string {
		return get(memberMap, this).messageViewImplementation.getDateString();
	}

	addAttachmentIcon(iconDescriptor: Object) {
		get(memberMap, this).messageViewImplementation.addAttachmentIcon(iconDescriptor);
	}

	getViewState(): VIEW_STATE {
		const members = get(memberMap, this);
		return members.Conversations.MessageViewViewStates[members.messageViewImplementation.getViewState()];
	}

	hasOpenReply(): boolean {
		get(memberMap, this).driver.getLogger().deprecationWarning('MessageView.hasOpenReply');
		return get(memberMap, this).messageViewImplementation.hasOpenReply();
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

	if (messageView.isLoaded()) {
		asap(() => {
			messageView.emit('load', {messageView});
		});
	} else {
		stream
			.filter(event => event.eventName === 'messageLoad')
			.onValue(event => {
				messageView.emit('load', {
					messageView: messageView
				});
			});
	}

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
