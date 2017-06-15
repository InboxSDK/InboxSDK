/**
* @class
* Object that represents a visible message in the UI. There are properties to access data about the message
* itself as well as change the state of the UI. MessageViews have a view state as well as a loaded state. These
* 2 properties are orthogonal to each other.
*
* A messages' view state can be one of {MessageViewViewStates.EXPANDED}, {MessageViewViewStates.COLLAPSED} or {MessageViewViewStates.HIDDEN}.
* Gmail and Inbox visually display messages in a thread in different ways depending on what they are trying
* to show a user. These values are described in the enum {MessageViewViewStates}.
*
* The load state of a message determines whether all of the data pertaining to a message has been loaded in the UI.
* In some case, not all the information (such as recipients or the body) may be loaded, typically when the the view
* state is {COLLAPSED} or {HIDDEN}. You should not depend on any relationship between the view state and load state. Instead,
* use the provided {MessageView.getViewState()} and {MessageView.isLoaded()} methods.
*/
var MessageView = /** @lends MessageView */{

	/**
	* Adds an {AttachmentCardView} to the message. Each message has an area where attachments of that message are shown as a set of
	* preview cards. These may be for file attachments or even inline YouTube links. This method allows you to add your own.
	* ^gmail
	* ^inbox
	* @param {AttachmentCardOptions|AttachmentCardNoPreviewOptions} cardOptions - The configuration of the AttachmentCardView to create.
	* @return {AttachmentCardView}
	*/
	addAttachmentCardView: function(){},

	/**
	* Adds a button to the download all area of the attachments tray. This function
	* will not be implemented in Inbox.
	* ^gmail
	* @param {AttachmentsToolbarButtonDescriptor} buttonOptions - The configuration of the button to create.
	* @return {void}
	*/
	addAttachmentsToolbarButton: function(){},

	/**
	* Adds a button to the message.
	* ^gmail
	* @param {MessageViewToolbarButtonDescriptor} options - The configuration of the button to create.
	* @return {void}
	*/
	addToolbarButton: function(){},

	/**
	* Returns the body element of the message as displayed to the user. This element includes any qouted areas.
	* Use this method when you want to decorate the body of the message,
	* i.e. if you wanted to linkify all dates you found in a message for scheduling purposes
	* ^gmail
	* ^inbox
	* @return {HTMLElement}
	*/
	getBodyElement: function(){},

	/**
	* Gets the ID of the message and returns it as a Promise. The promise will
	* reject with an error if this is called on a message that isn't loaded yet.
	* ^gmail
	* ^inbox
	* @return {Promise.<string>}
	*/
	getMessageIDAsync: function(){},

	// TODO non-file-attachment card views are asynchronously loaded. Add some sort of
	// registerAttachmentCardViewHandler function to listen for other types of
	// attachment cards.
	/**
	* Returns all the attachment card views of type FILE currently visible for this message.
	* ^gmail
	* ^inbox
	* @return {AttachmentCardView[]}
	*/
	getFileAttachmentCardViews: function(){},

	/**
	* Returns whether the element you provided or not is contained within the qouted area of the MessageView. This is useful
	* when you want to parse through the contents of the {HTMLElement} returned by {MessageView.getBodyElement()}
	* and test whether one if its children is in the qouted area (because you'll usually ignore those elements).
	* ^gmail
	* ^inbox
	* @return {boolean}
	*/
	isElementInQuotedArea: function(){},

	/**
	* Returns whether this message has been loaded yet. If the message has not been loaded, some of the data related methods on
	* this object may return empty results. The message may be loaded once the user clicks on the message stub.
	* ^gmail
	* ^inbox
	* @return {boolean}
	*/
	isLoaded: function(){},

	/**
	* Returns an array of MessageViewLinkDescriptors representing all the links in the message and their associated metadata.
	* This is useful when you want to parse links in a message and take some action on them, this takes care of detecting whether
	* the link is in the qouted area or not and parsing out the url/anchor text of the link.
	* i.e. if you wanted to linkify all dates you found in a message for scheduling purposes
	* ^gmail
	* ^inbox
	* @return {MessageViewLinkDescriptor[]}
	*/
	getLinksInBody: function(){},

	/**
	* Get the contact of the sender of this message.
	* ^gmail
	* ^inbox
	* @return {Contact}
	*/
	getSender: function(){},

	/**
	* Get all the recipients of this message (to, cc, bcc).
	* ^gmail
	* ^inbox
	* @return {Contact[]}
	*/
	getRecipients: function(){},

	/**
	* Get the {ThreadView} that this MessageView is in.
	* ^gmail
	* ^inbox
	* @return {ThreadView}
	*/
	getThreadView: function(){},

	/**
	 * Gets Gmail's representation of the timestamp of the message.
	 * Note: this returns a string representation because timezone information is not available,
	 * the accuracy is limited to minutes, and it is formatted to the user's language.
	 * ^gmail
	 * @return {string}
	 */
	getDateString: function(){},

	/**
	* Adds an attachment message's top line near the date.
	* ^gmail
	* @param {MessageAttachmentIconDescriptor|Stream.<MessageAttachmentIconDescriptor>} iconDescriptor - The options for the icon to add.
	* @return {void}
	*/
	addAttachmentIcon: function() {},

	/**
	* Returns the view state of this Message view. The possible view states are
	* {MessageViewViewStates.HIDDEN} (no information visible),
	* {MessageViewViewStates.COLLAPSED} (partial information visible) or
	* {MessageViewViewStates.EXPANDED}
	* ^gmail
	* ^inbox
	* @return {MessageViewViewStates}
	*/
	getViewState: function() {},

	/**
	 * Fires when message viewState is changed
	 * ^gmail
	 * ^inbox
	 * @event MessageView#viewStateChange
	 * @param {MessageViewViewStates} newViewState - the new state the message view is in
	 * @param {MessageViewViewStates} oldViewState - the old state the message view was in
	 * @param {MessageView} messageView - the message view whose state changed
	 */

	/**
	 * Fires when the user hovers over a contact.
	 * ^gmail
	 * ^inbox
	 * @event MessageView#contactHover
	 * @param {Contact} contact - the contact that was hovered over
	 * @param {string} contactType - whether the hovered contact was a 'sender' or 'recipient'
	 * @param {MessageView} messageView - the message view that the contact was a part of
	 * @param {ThreadView} threadView - the thread view that the contact was a part of
	 */

	 /**
	* Fires when the data for a message is loaded. This can happen when the message view is
	* first presented or later when the user chooses to expand its view state.
	* ^gmail
	* ^inbox
	* @event MessageView#load
	*/

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when the view card is destroyed
	 * @event MessageView#destroy
	 */

};

/**
* @class
* This type is accepted by the {MessageView.addAttachmentCardView()} method to insert an {AttachmentCardView}
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
	* A description of the attachment card displayed subtly.
	* @type {string}
	*/
	description:null,

	/**
	* The url of an "open" or "preview" action for this attachment. The attachment cards primary action (clicking on the card)
	* takes the user in a new window to the URL specified here. This is also the URL used if the user right clicks and copies
	* the link address.
	* @type {string}
	*/
	previewUrl:null,

	/**
	* A URL to an image representing the thumbnail preview of the attachment card
	* @type {string}
	*/
	previewThumbnailUrl:null,

	/**
	 * URL to an icon to fallback on in case the previewThumbnailUrl fails to load.
	 * @type {string}
	 */
	failoverPreviewIconUrl:null,

	/**
	* A callback to call when the user clicks on the preview area. Note that if the previewUrl is also set,
	* the preview will open in a new window <b>in addition</b> to this callback being called. The PreviewEvent has
	* one property - {attachmentCardView}. It also has a {preventDefault()} function. Calling
	* this function prevents the preview from opening in a new window.
	* @type {func(event)}
	*/
	previewOnClick:null,

	/**
	* The url of the icon of the attachment.
	* @type {string}
	*/
	fileIconImageUrl:null,

	/**
	* An array of buttons to support functionality in addition to the preview functionality
	* @type {Array.<DownloadButtonDescriptor|CustomButtonDescriptor>}
	*/
	buttons:null,

	/**
	* The color of the attachment card fold and an accompying accent color.
	* ^optional
	* ^default=#BEBEBE
	* @type {string}
	*/
	foldColor:null,

	/**
	* The mime type of the attachment if it has one. This is used to render image
	* mime types slightly differently to be consistent with Gmail and Inbox. Specifically,
	* the {previewThumbnailUrl} images are rendered full bleed to show as much
	* of the image as possible. As such the hover UI looks slightly different.
	*
	* If null, it is assumed that the attachment is NOT an image mime type.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	mimeType: null
};


/**
* @class
* This type is accepted by the {MessageView.addAttachmentCardView()} method to insert an {AttachmentCardView}
* for a message. An attachment card offers a way to display a rich preview of any 'attachment' to a message. Note that
* 'attachments' is referenced in the generic sense and need not be a downloadable file specifically. One example would be to
* show you YouTube attachment cards for any YouTube links present in an email.
*
* These options differ from {AttachmentCardOptions} in that there is no {previewThumbnailUrl}, instead you use a
* {iconThumbnailUrl} to show a generic icon. These are rendered and positioned slightly differently than preview images.
*/
var AttachmentCardNoPreviewOptions = /** @lends AttachmentCardNoPreviewOptions */{

	/**
	* The title of the attachment card. Typically a filename is set here.
	* @type {string}
	*/
	title:null,

	/**
	* A description of the attachment card displayed subtly.
	* @type {string}
	*/
	description:null,

	/**
	* The url of an "open" or "preview" action for this attachment. The attachment cards primary action (clicking on the card)
	* takes the user in a new window to the URL specified here. This is also the URL used if the user right clicks and copies
	* the link address.
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
	* one property - {attachmentCardView}. It also has a {preventDefault()} function. Calling
	* this function prevents the preview from opening in a new window.
	* @type {func(event)}
	*/
	previewOnClick:null,

	/**
	* The url of the icon of the attachment.
	* @type {string}
	*/
	fileIconImageUrl:null,

	/**
	* An array of buttons to support functionality in addition to the preview functionality.
	* @type {Array.<DownloadButtonDescriptor|CustomButtonDescriptor>}
	*/
	buttons:null,

	/**
	* The color of the attachment card fold and an accompying accent color.
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
	* @type {func(event)}
	*/
	onClick:null,

	/**
	*	Whether the download action should open in a new tab. It may be useful to open a new tab to perform the download if
	* for example you want to sometimes redirect the user to a login or permission page. By default, the SDK will attempt
	* to download the file in the same tab and not open a new one. This is typically a better user experience.
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
	* The icon to use. Use a white image with transparent background for consistency.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* The tooltip to show when the user hovers over the button.
	* @type {string}
	*/
	tooltip:null,

	/**
	* A callback that is called when the user presses the button.
	* @type {func(AttachmentCardClickEvent)}
	*/
	onClick:null
};

/**
* @class
* This object is given to the onClick function defined in a {CustomButtonDescriptor} added to an {AttachmentCardView}.
*/
var AttachmentCardClickEvent = /** @lends AttachmentCardClickEvent */{
	/**
	* Get the URL for the attachment card's download link as a promise for a
	* string. For FILE attachment cards, the URL will be a short-lived URL that
	* can be accessed without cookies. For CUSTOM attachment cards, the URL will
	* be the downloadUrl property of the card's download button if it has one,
	* otherwise null. Other attachment card types may not have a download URL,
	* and the promise may resolve to null.
	* To work in Inbox, your extension must have permissions to the
	* "https://mail-attachment.googleusercontent.com/" domain.
	* @return {Promise.<string>}
	*/
	getDownloadURL: function() {}
};


/**
* @class
*/
var MessageViewLinkDescriptor = /** @lends MessageViewLinkDescriptor */{

	/**
	* The anchor text of the link.
	* @type {string}
	*/
	text:null,

	/**
	* The html string of the link found.
	* @type {string}
	*/
	html:null,

	/**
	* The actual {HTMLElement} of the link found.
	* @type {HTMLElement}
	*/
	element:null,

	/**
	* The url of the link.
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
	* The tooltip of the button.
	* @type {string}
	*/
	tooltip:null,

	/**
	* The url of an icon image to use. A black icon with transparent background is preferred.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* The callback when the button is clicked. The event object has a property {event.attachmentCardViews} which is an
	* array of {AttachmentCardView}s.
	* @type {func(event)}
	*/
	onClick:null
};

/**
* @class
* This type is used to describe a button you add to a {MessageView}.
*/
var MessageAttachmentIconDescriptor = /** @lends MessageAttachmentIconDescriptor */{

	/**
	* URL for the icon to show on in the attachments column. Should be a local extension file URL or a HTTPS URL.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* A CSS class to apply to the icon.
	* ^optional
	* ^default=MODIFIER
	* @type {string}
	*/
	iconClass:null,

	/**
	* The tooltip text to show when the user hovers over the icon.
	* @type {string}
	*/
	tooltip:null,

	/**
	* Function to call when the user clicks the icon.
	* ^optional
	* @type {function()}
	*/
	onClick: null
};

/**
* @class
* The options to use to configure buttons added to the message.
*/
var MessageViewToolbarButtonDescriptor = /** @lends MessageViewToolbarButtonDescriptor */{
	/**
	* The section of the message to place the button.
	* @type {MessageViewToolbarSectionNames}
	*/
	section: null,

	/**
	* Text to show on the menu item.
	* @type {string}
	*/
	title:null,

	/**
	* URL for the icon to show on the menu item. Should be a local extension file
	* URL or a HTTPS URL. The image will be displayed with a height and width of
	* 16px.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* An optional class to apply to the icon.
	* ^optional
	* @type {string}
	*/
	iconClass:null,

	/**
	* This is called when the menu item is clicked.
	* @type {function}
	*/
	onClick:null,

	/**
	* Used to specify the order of added menu items.
	* @type {function}
	*/
	orderHint: null
};
