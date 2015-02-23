var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var AttachmentCardView = require('./attachment-card-view');

var memberMap = new WeakMap();

/**
* @class
* Object that represents a visible message in the UI. There are properties to access data about the message
* itself as well as change the state of the UI.MessageViews have a view state as well as a loaded state. These
* 2 properties are orthoganal to each other.
*
* A messages' view state can be one of <code>EXPANDED</code>, <code>COLLAPPSED</code> or <code>HIDDEN</code>.
* Gmail and Inbox visually display messages in a thread in different ways depending on what they are trying
* to show a user.
*
* The load state of a message determines whether all of the data pertaining to a message has been loaded in the UI.
* In some case, not all the information (such as recipients or the body) may be loaded, typically when the the view
* state is COLLAPSED or HIDDEN. You should not depend on any relationship between the view state and load state. Instead,
* use the provided <code>getViewState</code> and <code>isLoaded</code> methods.
*/
var MessageView = function(messageViewImplementation, appId, membraneMap, Conversations){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.messageViewImplementation = messageViewImplementation;
	members.membraneMap = membraneMap;
	members.Conversations = Conversations;

	_bindToEventStream(this, members, messageViewImplementation.getEventStream());
};

MessageView.prototype = Object.create(EventEmitter.prototype);

_.extend(MessageView.prototype, /** @lends MessageView */{

	/**
	* Adds an <code>AttachmentCardView</code> to the message. Each message has an area where attachments of that message are shown as a set of
	* preview cards. These may be for file attachments or even inline YouTube links. This method allows you to add your own.
	* @param {AttachmentCardOptions} cardOptions - the configuration of the AttachmentCardView to create
	* @return {AttachmentCardView}
	*/
	addAttachmentCardView: function(cardOptions){
		var attachmentCardViewDriver = memberMap.get(this).messageViewImplementation.addAttachmentCard(cardOptions);
		var attachmentCardView = new AttachmentCardView(attachmentCardViewDriver);

		return attachmentCardView;
	},


	/**
	* Adds an <code>AttachmentCardView</code> to the message. Using this method instead of <code>addAttachmentCardView</code>
	* indicates to the SDK that you don't have a preview image available and instead want to show the image of a icon in the
	* thumbnail area instead. The SDK will then render this appropriately.
	* @param {AttachmentCardNoPreviewOptions} cardOptions - the configuration of the AttachmentCardView to create
	* @return {AttachmentCardView}
	*/
	addAttachmentCardViewNoPreview: function(cardOptions){
		var attachmentCardViewDriver = memberMap.get(this).messageViewImplementation.addAttachmentCardNoPreview(cardOptions);
		var attachmentCardView = new AttachmentCardView(attachmentCardViewDriver);

		return attachmentCardView;
	},

	/**
	* Adds a button to the download all area of the attachments tray. <screenshot>
	* @param {AttachmentsToolbarButtonDescriptor} buttonOptions - the configuration of the AttachmentCardView to create
	* @return {void}
	*/
	addAttachmentsToolbarButton: function(buttonOptions){
		memberMap.get(this).messageViewImplementation.addButtonToDownloadAllArea(buttonOptions);
	},


	/**
	* Returns the body element of the message as displayed to the user. This element includes any qouted areas.
	* Use this method when you want to decorate the body of the message,
	* i.e. if you wanted to linkify all dates you found in a message for scheduling purposes
	* @return {HTMLElement}
	*/
	getBodyElement: function(){
		return memberMap.get(this).messageViewImplementation.getContentsElement();
	},

	// returns array of attachment card views
	/**
	* Returns all the attachment card views currently visible for this message. Includes Gmail/Inbox native attachment
	* cards as well as those added by applications
	* @return {AttachmentCardView[]}
	*/
	getAttachmentCardViews: function(){
		return _.map(memberMap.get(this).messageViewImplementation.getAttachmentCardViewDrivers(), function(attachmentCardViewDriver){
			return new AttachmentCardView(attachmentCardViewDriver);
		});
	},


	/**
	* Returns whether the element you provided or not is contained within the qouted area of the MessageView. This is useful
	* when you want to parse through the contents of the <code>HTMLElement</code> returned by <code>getContentsElement</code>
	* and test whether one if its children is in the qouted area (because you'll usually ignore those elements).
	* @return {boolean}
	*/
	isElementInQuotedArea: function(element){
		memberMap.get(this).messageViewImplementation.isElementInQuotedArea(element);
	},

	/**
	* Returns whether this message has been loaded yet. If the message has not been loaded, some of the data related methods on
	* this object may return empty results. There is no way to set the load state to true directly. If you require this message
	* to be loaded, you should set the view state to <code>EXPANDED</code>.
	* @return {boolean}
	*/
	isLoaded: function() {
		return memberMap.get(this).messageViewImplementation.isLoaded();
	},

	/**
	* Returns an array of MessageViewLinkDescriptors representing all the links in the message and their associated metadata.
	* This is useful when you want to parse links in a message and take some action on them, this takes care of detecting whether
	* the link is in the qouted area or not and parsing out the url/anchor text of the link.
	* i.e. if you wanted to linkify all dates you found in a message for scheduling purposes
	* @return {MessageViewLinkDescriptor[]}
	*/
	getLinksInBody: function(){
		return memberMap.get(this).messageViewImplementation.getLinks();
	},

	/**
	* Get the contact of the sender of this message.
	* @return {Contact}
	*/
	getSender: function(){
		return memberMap.get(this).messageViewImplementation.getSender();
	},

	/**
	* Get all the recipients of this message (to, cc, bcc)
	* @return {Contact[]}
	*/
	getRecipients: function(){
		return memberMap.get(this).messageViewImplementation.getRecipients();
	},

	/**
	* Get the <code>ThreadView</code> that this MessageView is in
	* @return {ThreadView}
	*/
	getThreadView: function(){
		var members = memberMap.get(this);
		return members.membraneMap.get(members.messageViewImplementation.getThreadViewDriver());
	},

	/**
	* Returns the view state of this Message view. The possible view states are
	* <code>Conversations.MessageViewViewStates.HIDDEN</code> (no information visible),
	* <code>Conversations.MessageViewViewStates.COLLAPSED</code> (partial information visible) or
	* <code>Conversations.MessageViewViewStates.EXPANDED</code>
	* @return {Conversation.MessageViewViewState}
	*/
	getViewState: function() {
		var members = memberMap.get(this);
		return members.Conversations.MessageViewViewStates[members.messageViewImplementation.getViewState()];
	},

	setViewState: function(viewState){
		var MessageViewViewStates = memberMap.get(this).Conversations.MessageViewViewStates;
		var internalViewState;

		if(viewState === MessageViewViewState.HIDDEN){
			internalViewState = 'HIDDEN';
		}
		else if(viewState === MessageViewViewState.COLLAPSED){
			internalViewState = 'COLLAPSED';
		}
		else{
			internalViewState = 'EXPANDED';
		}

		memberMap.get(this).messageViewImplementation.setViewState(internalViewState);
	}


	/**
	 * Fires when message viewState is changed
	 * @event MessageView#viewStateChange
	 */

	/**
	 * Fires when the user hovers over a contact. {ContactHoverEvent}
	 * @event MessageView#contactHover
	 */

	 /**
	* Fires when the data for a message is loaded. This can happen when the message view is first presented or later when the user chooses to expand its view state.
	* @event MessageView#load
	*/

	/**
	 * Fires when the view card is destroyed
	 * @event MessageView#destroy
	 */



});


function _bindToEventStream(messageView, members, stream){
	stream.onEnd(function(){
		messageView.emit('destroy');

		messageView.removeAllListeners();
	});

	stream
		.filter(function(event){
			return event.type !== 'internal' && event.eventName === 'contactHover';
		})
		.onValue(function(event){
			messageView.emit(event.eventName, {
				contactType: event.type,
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

module.exports = MessageView;


/**
* @class
* This type is required by the <code>MessageView.addAttachmentCard</code> method to insert an <code>AttachmentCardView</code>
* for a message. An attachment card offers a way to display a rich preview of any 'attachment' to a message. Note that
* 'attachments' is referenced in the generic sense and need not be a downloadable file specifically. One example would be to
* show you YouTube attachment cards for any YouTube links present in an email.
*/
var AttachmentCardOptions = /** @lends AttachmentCardOptions */{

	/**
	* The title of the attachment card. Typically a filename is set here.
	* @type {string}
	*/
	title:null,

	/**
	* A description of the attachment card displayed subtly
	* @type {string}
	*/
	description:null,

	/**
	* The url of an "open" or "preview" action for this attachment. The attachment cards primary action (clicking on the card)
	* takes the user in a new window to the URL specified here. This is also the URL used if the user right clicks and copies
	* the link address
	* @type {string}
	*/
	previewUrl:null,

	/**
	* A URL to an image representing the thumbnail preview of the attachment card
	* @type {string}
	*/
	previewThumbnailUrl:null,

	/**
	* A callback to call when the user clicks on the preview area. Note that if the previewUrl is also set,
	* the preview will open in a new window <b>in addition</b> to this callback being called. The PreviewEvent has
	* one property - <code>attachmentCardView</code>. It also has a <code>preventDefault()</code> function. Calling
	* this function prevents the preview from opening in a new window.
	* @type {function(event)}
	*/
	previewOnClick:null,

	/**
	* The url of the icon of the attachment
	* @type {boolean}
	*/
	fileIconImageUrl:null,

	/**
	* An array of buttons to support functionality in addition to the preview functionality
	* @type {DownloadButtonDescriptor[]|CustomButtonDescriptor[]}
	*/
	buttons:null,

	/**
	* The color of the attachment card fold and an accompying accent color
	* ^optional
	* ^default=#BEBEBE
	* @type {string}
	*/
	foldColor:null,

	/**
	* The mime type of the attachment if it has one. This is used to render image
	* mime types slightly differently to be consistent with Gmail and Inbox. Specifically,
	* the <code>previewThumbnailUrl</code> images are rendered full bleed to show as much
	* of the image as possible. As such the hover UI looks slightly different.
	*
	* If null, it is assumed that the attachment is NOT an image mime type
	* ^optional
	* ^default=null
	*/
	mimeType: null
};


/**
* @class
* This type is required by the <code>MessageView.addAttachmentCardNoPreview</code> method to insert an <code>AttachmentCardView</code>
* for a message. An attachment card offers a way to display a rich preview of any 'attachment' to a message. Note that
* 'attachments' is referenced in the generic sense and need not be a downloadable file specifically. One example would be to
* show you YouTube attachment cards for any YouTube links present in an email.
*
* These options differ from <code>AttachmentCardOptions</code> in that there is no <code>previewThumbnailUrl</code>, instead you use a
* iconThumbnailUrl to show a generic icon. These are rendered and positioned slightly differently than preview images.
*/
var AttachmentCardNoPreviewOptions = /** @lends AttachmentCardNoPreviewOptions */{

	/**
	* The title of the attachment card. Typically a filename is set here.
	* @type {string}
	*/
	title:null,

	/**
	* A description of the attachment card displayed subtly
	* @type {string}
	*/
	description:null,

	/**
	* The url of an "open" or "preview" action for this attachment. The attachment cards primary action (clicking on the card)
	* takes the user in a new window to the URL specified here. This is also the URL used if the user right clicks and copies
	* the link address
	* @type {string}
	*/
	previewUrl:null,

	/**
	* A URL to an icon to show in the thumbnail area of the attachment card
	* @type {string}
	*/
	iconThumbnailUrl:null,

	/**
	* A callback to call when the user clicks on the preview area. Note that if the previewUrl is also set,
	* the preview will open in a new window <b>in addition</b> to this callback being called. The PreviewEvent has
	* one property - <code>attachmentCardView</code>. It also has a <code>preventDefault()</code> function. Calling
	* this function prevents the preview from opening in a new window.
	* @type {function(event)}
	*/
	previewOnClick:null,

	/**
	* The url of the icon of the attachment
	* @type {boolean}
	*/
	fileIconImageUrl:null,

	/**
	* An array of buttons to support functionality in addition to the preview functionality
	* @type {DownloadButtonDescriptor[]|CustomButtonDescriptor[]}
	*/
	buttons:null,

	/**
	* The color of the attachment card fold and an accompying accent color
	* ^optional
	* ^default=#BEBEBE
	* @type {string}
	*/
	foldColor:null
};


/**
* @class
*/
var DownloadButtonDescriptor = /** @lends DownloadButtonDescriptor */{

	/**
	* The url of the file to download when the user presses the download button.
	* @type {string}
	*/
	downloadUrl:null,

	/**
	* A callback that is called when the user presses the download button. Note, this is called <b>in addition</b> to file
	* actually downloading which happens automatically.
	* @type {function(event)}
	*/
	onClick:null,

	/**
	*	Whether the download action should open in a new tab. It may be useful to open a new tab to perform the download if
	* for example you want to sometimes redirect the user to a login or permission page. By default, the SDK will attempt
	* to download the file in the same tab and not open a new one. This is typically a better user experience
	* ^optional
	* ^default=false
	* @type {boolean}
	*/
	openInNewTab:null
};

/**
* @class
*/
var CustomButtonDescriptor = /** @lends CustomButtonDescriptor */{

	/**
	* The icon to use. Use a white image with transparent background for consistency
	* @type {string}
	*/
	iconUrl:null,

	/**
	* The tooltip to show when the user hovers over the button
	* @type {string}
	*/
	tooltip:null,

	/**
	* A callback that is called when the user presses the download button. Note, this is called <b>in addition</b> to file
	* actually downloading which happens automatically.
	* @type {function(event)}
	*/
	onClick:null
};



/**
* @class
*/
var MessageViewLinkDescriptor = /** @lends MessageViewLinkDescriptor */{

	/**
	* The anchor text of the link
	* @type {string}
	*/
	text:null,

	/**
	* The html string of the link found
	* @type {string}
	*/
	html:null,

	/**
	* The actual <code>HTMLElement</code> of the link found
	* @type {function(event)}
	*/
	element:null,

	/**
	* The url of the link
	* @type {string}
	*/
	href:null,

	/**
	* Whether the link was found in the qouted area of the message or not
	* @type {boolean}
	*/
	isInQuotedArea:null
};

/**
* @class
*/
var AttachmentsToolbarButtonDescriptor = /** @lends AttachmentsToolbarButtonDescriptor */{

	/**
	* The tooltip of the button
	* @type {string}
	*/
	tooltip:null,

	/**
	* The url of an icon image to use. A black icon with transparent background is preferred.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* The callback when the button is clicked. The event object has a property <code>event.attachmentCardViews</code> which is an
	* array of <code>AttachmentCardView</code>s.
	* @type {function(event)}
	*/
	onClick:null
};
