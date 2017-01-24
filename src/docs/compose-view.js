/**
 * @class
 * Object that represents an open compose window <b>or</b> reply widget.
 * The fields can be easily read and modified, and certain elements can
 * be attached to it. This includes buttons and sidebars.
 */
var ComposeView = /** @lends ComposeView */ {

	/**
	 * Inserts a button into the compose bar. This method also accepts a stream of {ComposeButtonDescriptor}s so that you can change the appearance of your button after you've added it.
	 * ^gmail
	 * ^inbox
	 * @param {ComposeButtonDescriptor|Stream.<ComposeButtonDescriptor>} buttonDescriptor - The details of the button to add to the compose bar.
	 * @return {void}
	 */
	addButton: function(){},

	/**
	 * Adds a horizontal bar underneath the control section of the ComposeView. This is useful to add more complex UI interactions but should be used sparingly.
	 * ^gmail
	 * @param {StatusBarDescriptor} statusBarDescriptor - The details of the status bar to add to the compose view.
	 * @return {StatusBarView}
	 */
	addStatusBar: function(){},

	// TODO document?
	addRecipientRow: function(){},

	/**
	 * Closes the compose window.
	 * ^gmail
	 * ^inbox
	 * @return {void}
	 */
	close: function(){},

	/**
	 * Simulates clicking the compose's send button.
	 * ^gmail
	 * ^inbox
	 * @return {void}
	 */
	send: function() {},

	/**
	 * Returns the HTMLElement of the body of the compose view.
	 * ^gmail
	 * ^inbox
	 * @return {HTMLElement}
	 */
	getBodyElement: function(){},

	/* NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS */
	getComposeID: function(){},

	/**
	 * Returns the initial message ID of the draft. If this is a new compose then the
	 * message ID will be null. If the user has opened an existing draft then this function
	 * returns the message ID of the draft when it was first opened.
	 * The use of the getDraftID() method is recommended over this method. This method
	 * will not be implemented in Inbox.
	 * ^gmail
	 * @return {string}
	 */
	getInitialMessageID: function(){},

	/* deprecated */
	getMessageID: function() {},

	/**
	 * Returns the thread ID of the draft. If the draft is not a reply, then this
	 * will be null.
	 * ^gmail
	 * @return {string}
	 */
	getThreadID: function() {},

	/**
	 * Returns a Promise for the compose view's draft ID. If this is called on an
	 * empty draft that doesn't have a draft ID assigned yet, then the promise
	 * won't resolve until the draft gets assigned an ID, or the promise may
	 * resolve to null if the draft remains empty and is closed before being
	 * assigned an ID.
	 * ^gmail
	 * @return {Promise.<string>}
	 */
	getDraftID: function() {},

	/**
	 * Acts the same as {ComposeView.getDraftID()}, except that if the ComposeView
	 * does not yet have a draft ID assigned, then the returned Promise resolves
	 * to null immediately instead of waiting.
	 * ^gmail
	 * @return {Promise.<string>}
	 */
	getCurrentDraftID: function() {},

	/**
	 * Returns an html string of the contents of the body of the compose view.
	 * ^gmail
	 * ^inbox
	 * @return {string}
	 */
	getHTMLContent: function(){},

	/**
	 * Returns a string of HTML containing any text and elements highlighted by
	 * the user inside the email body.
	 * ^gmail
	 * ^inbox
	 * @return {string}
	 */
	getSelectedBodyHTML: function(){},

	/**
	 * Returns a plain string containing any text highlighted by the user inside
	 * the email body.
	 * ^gmail
	 * ^inbox
	 * @return {string}
	 */
	getSelectedBodyText: function(){},

	/**
	 * Returns a plain string containing the subject of the email.
	 * ^gmail
	 * ^inbox
	 * @return {string}
	 */
	getSubject: function(){},

	/**
	 * Returns a plain text string containing all the text of the email body.
	 * ^gmail
	 * ^inbox
	 * @return {string}
	 */
	getTextContent: function(){},

	/**
	 * Returns an array of objects containing the name and email address of all
	 * recipients on the TO line.
	 * ^gmail
	 * ^inbox
	 * @return {Contact[]}
	 */
	getToRecipients: function(){},

	/**
	 * Returns an array of objects containing the name and email address of all
	 * recipients on the CC line.
	 * ^gmail
	 * ^inbox
	 * @return {Contact[]}
	 */
	getCcRecipients: function(){},

	/**
	 * Returns an array of objects containing the name and email address of all
	 * recipients on the BCC line.
	 * ^gmail
	 * ^inbox
	 * @return {Contact[]}
	 */
	getBccRecipients: function(){},

	/**
	 * Places text inside the body of the message at the cursor or at the beginning of the message if the cursor is not
	 * in the body of the message. If anything inside the body is selected, it will be replaced.
	 * ^gmail
	 * ^inbox
	 * @param {string} text - The text to insert.
	 * @return {void}
	 */
	insertTextIntoBodyAtCursor: function(text){},

	/**
	 * Places HTML inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message.
	 * If anything inside the body is selected, it will be replaced.
	 * Returns the root HTMLElement of the inserted link.
	 * ^gmail
	 * ^inbox
	 * @param {string | HTMLElement} html - The HTML to insert. You can provide an HTML string or a DOM element.
	 * @return {HTMLElement}
	 */
	insertHTMLIntoBodyAtCursor: function(html){},

	/**
	 * Places a link chip inside the body of the message at the cursor or at the beginning of the message if
	 * the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	 * A link chip is an enhanced link with an icon and a callout. These are typically used by Gmail when inserting
	 * a Google Drive link.
	 * ^gmail
	 * ^inbox
	 * @param {string} text - The anchor text of the link to insert.
	 * @param {string} url - The URL of the link to insert.
	 * @param {string} iconUrl - The URL of the icon that will be shown in the chip.
	 * Returns the HTMLElement of the inserted chip.
	 *
	 * @return {HTMLElement}
	 *
	 */
	insertLinkChipIntoBodyAtCursor: function(){},

	/**
	 * Places a link inside the body of the message at the cursor or at the beginning of the message
	 * if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	 * Returns the HTMLElement of the inserted link.
	 * ^gmail
	 * ^inbox
	 * @param {string} text - The anchor text of the link to insert.
	 * @param {string} url - The URL of the link to insert.
	 * @return {HTMLElement}
	 */
	insertLinkIntoBodyAtCursor: function(){},

	/**
	 * Whether or not this compose view is an inline reply. Inline replies are used by Gmail and Inbox when responding
	 * to a message right underneath the original message. You typically will not need to use this.
	 * ^gmail
	 * ^inbox
	 * @return {boolean}
	 */
	isInlineReplyForm: function(){},

	/**
	 * Whether or not this compose view is in full-screen mode.
	 * ^gmail
	 * ^inbox
	 * @return {boolean}
	 */
	isFullscreen: function(){},

	/**
	 * This allows the fullscreen state to be changed.
	 * ^gmail
	 * ^inbox
	 * @param  {boolean} minimized - If true, the compose view will be made fullscreen.
	 * @return {void}
	 */
	setFullscreen: function(){},

	/**
	 * Whether or not this compose view is minimized.
	 * ^gmail
	 * ^inbox
	 * @return {boolean}
	 */
	isMinimized: function(){},

	/**
	 * This allows the minimize state to be changed.
	 * ^gmail
	 * ^inbox
	 * @param  {boolean} minimized - If true, the compose view will be minimized.
	 * @return {void}
	 */
	setMinimized: function(){},

	/**
	 * If the compose is an inline reply form, this triggers it to be converted
	 * to a full compose view. Note that the current ComposeView object will emit
	 * its destroy event, and a new ComposeView object will be created. This
	 * function returns a promise for the new ComposeView.
	 * ^gmail
	 * ^inbox
	 * @return {Promise.<ComposeView>}
	 */
	popOut: function() {},

	/**
	 * Whether or not this compose view is a reply. Replies can be inline or in a seperate pop out window.
	 * You typically will not need to use this.
	 * ^gmail
	 * @return {boolean}
	 */
	isReply: function(){},

	/**
	 * Sets the "To" field of the draft, replacing the existing values.
	 * ^gmail
	 * ^inbox
	 * @param {string[]} emails - Array of email addresses to set.
	 * @return {void}
	 */
	setToRecipients: function(){},

	/**
	 * Sets the "CC" field of the draft, replacing the existing values.
	 * ^gmail
	 * ^inbox
	 * @param {string[]} emails - Array of email addresses to set.
	 * @return {void}
	 */
	setCcRecipients: function(){},

	/**
	 * Sets the "BCC" field of the draft, replacing the existing values.
	 * ^gmail
	 * ^inbox
	 * @param {string[]} emails - Array of email addresses to set.
	 * @return {void}
	 */
	setBccRecipients: function(){},

	/**
	 * Gets the contact info of the value selection in the "From" field. Gives
	 * information about the user even if the From field isn't visible.
	 * ^gmail
	 * ^inbox
	 * @return {Contact}
	 */
	getFromContact: function(){},

	/**
	 * Gets all of the options available in the "From" field.
	 * ^gmail
	 * ^inbox
	 * @return {Contact[]}
	 */
	getFromContactChoices: function(){},

	/**
	 * Changes the email address picked in the from field. Throws an exception if
	 * the requested choice isn't available. No error is thrown if the From field
	 * is not visible if the user's own email address is chosen.
	 * ^gmail
	 * ^inbox
	 * @param {string} email - Address to set the from field to use.
	 * @return {void}
	 */
	setFromEmail: function(){},

	/**
	 * Replaces the entirety of the current subject of the compose
	 * and replaces the subject with the passed in text
	 * ^gmail
	 * ^inbox
	 * @param {string} text - text to use for the subject
	 * @return {void}
	 */
	setSubject: function(){},

	/**
	 * Replaces the entirety of the compose's email body with the html
	 * value passed in.
	 * ^gmail
	 * ^inbox
	 * @param {string} html - html to use for the body
	 * @return {void}
	 */
	setBodyHTML: function(){},

	/**
	 * Replaces the entirety of the compose's email body with the text
	 * value passed in.
	 * ^gmail
	 * ^inbox
	 * @param {string} text - text to use for the body
	 * @return {void}
	 */
	setBodyText: function(){},

	/**
	 * Attaches a set of files into the compose view. The parameter must be an
	 * array of File objects, or Blob objects with their name properties set.
	 * ^gmail
	 * @param {Blob[]} files
	 * @return {void}
	 */
	attachFiles: function(files){},

	/**
	 * Attaches a set of files into the compose view inline in the message if
	 * possible. This works with images. The parameter must be an array of File
	 * objects, or Blob objects with their name properties set.
	 * ^gmail
	 * @param {Blob[]} files
	 * @return {void}
	 */
	attachInlineFiles: function(files){},

	//NOT DOCUMENTED BECAUSE STREAK-ONLY FOR NOW
	getElement: function(){},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when the compose view is closed. This can be triggered by the .close method, the user
	 * clicking the close or discard buttons, the message being sent, etc.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#destroy
	 * @param {string} messageID - If the composeView was closed without being sent and the draft
	 * was saved, then this property will have the draft's message ID after it saved. Otherwise it
	 * will be null. This property is only present in Gmail.
	 */

	/**
	 * Fires when the From value is changed.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#fullscreenChanged
	 * @param {boolean} fullscreen - tells whether the compose is now fullscreen
	 */

	/**
	 * Fires when the user presses send. During this phase (between the presending and sending events)
	 * you can modify the {ComposeView} before the message actually starts sending. Note that multiple
	 * applications may modify the message. This event is the only one which allows you to modify or
	 * cancel the sent message. This event may be emitted multiple times for one message.
	 * ^gmail
	 * @event ComposeView#presending
	 * @param {function} cancel - a function you can call to cancel the sending of this message. This
	 * will prevent the message from being sent.
	 */

	/**
	 * Fires when an AJAX request to Gmail/Inbox has been initiated but the response has not yet been
	 * received. Any modifications you make to the {ComposeView} at this point will not have an effect
	 * as the AJAX request has already been sent. You'd typically use this event to record stats about
	 * what messages are being sent.
	 * ^gmail
	 * @event ComposeView#sending
	 */

	/**
	 * Fires when the Gmail server has confirmed receiving the message. An event
	 * object containing properties about the sent message will be passed to the
	 * event listeners.
	 * ^gmail
	 * @event ComposeView#sent
	 * @param {string} threadID - the thread ID of the message that was just sent
	 * @param {string} messageID - the message ID of the message that was just sent
	 */

	/**
	 * Fires when the From value is changed.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#fromContactChanged
	 * @param {Contact} contact - the contact that was added to the "To" recipients
	 */

	/**
	 * Fires when any of the To/Cc/Bcc fields are changed.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#recipientsChanged
	 * @param {Contact[]} to.added - a list of contacts that were added to the "To" recipients
	 * @param {Contact[]} to.removed - a list of contacts that were removed from the "To" recipients
	 * @param {Contact[]} cc.added - a list of contacts that were added to the "CC" recipients
	 * @param {Contact[]} cc.removed - a list of contacts that were removed from the "CC" recipients
	 * @param {Contact[]} bcc.added - a list of contacts that were added to the "BCC" recipients
	 * @param {Contact[]} bcc.removed - a list of contacts that were removed from the "BCC" recipients
	 */

	/**
	 * Fires when a to contact is added.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#toContactAdded
	 * @param {Contact} contact - the contact that was added to the "To" recipients
	 */

	/**
	 * Fires when a to contact is removed.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#toContactRemoved
	 * @param {Contact} contact - the contact that was removed from the "To" recipients
	 */

	/**
	 * Fires when a CC contact is added.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#ccContactAdded
	 * @param {Contact} contact - the contact that was added to the "CC" recipients
	 */

	/**
	 * Fires when a CC contact is removed.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#ccContactRemoved
	 * @param {Contact} contact - the contact that was removed from the "CC" recipients
	 */

	/**
	 * Fires when BCC to contact is added.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#bccContactAdded
	 * @param {Contact} contact - the contact that was added to the "BCC" recipients
	 */

	/**
	 * Fires when a BCC contact is removed.
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#bccContactRemoved
	 * @param {Contact} contact - the contact that was removed from the "BCC" recipients
	 */

	/**
	 * Fires when the compose view is minimized
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#minimized
	 */

	/**
	 * Fires when the compose view is restored
	 * ^gmail
	 * ^inbox
	 * @event ComposeView#restored
	 */
};

/**
 * @class
 * This type is passed into the {ComposeView.addButton()} method as a way to configure the button shown.
 */
var ComposeButtonDescriptor = /** @lends ComposeButtonDescriptor */{
	/**
	 * Text to show when the user hovers the mouse over the button.
	 * @type {string}
	 */
	title:null,

	/**
	 * URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	iconUrl:null,

	/**
	 * An optional class to apply to the icon.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	iconClass:null,

	/**
	 * This is called when the button is clicked, and gets passed an event object. The event object will have a composeView
	 * object and optionally a dropdown property if the button had a dropdown.
	 * @type {func(event)}
	 */
	onClick:null,

	/**
	 * If true, the button will open a dropdown menu above it, and the event object will have a {dropdown} property of type {DropdownView} that
	 * allows the dropdown to be customized when opened.
	 * ^optional
	 * ^default=false
	 * @type {boolean}
	 */
	hasDropdown:null,

	/**
	 * There are currently two supported types of compose buttons, one which results in the message being sent and
	 * another which just modifies the current message but does not send it. The button is placed according to its
	 * type. The permissable values for type are {SEND_ACTION} and {MODIFIER}. Only {MODIFIER}
	 * is supported in Inbox currently.
	 * ^optional
	 * ^default=MODIFIER
	 * @type {string}
	 */
	type:null,

	/**
	 * If multiple buttons are placed next to each other, then they will be ordered by this value.
	 * ^optional
	 * ^default=0
	 * @type {number}
	 */
	orderHint:null,

	/**
	 * If false, the button will be disabled and will not emit any events.
	 * ^optional
	 * ^default=true
	 * @type {boolean}
	 */
	enabled: null
};


/**
 * @class  Contact
 * Simple object that contains the email address and full name if it exists.
 */
var Contact = /** @lends Contact */ {

	/**
	 * The email address of the contact.
	 * @type {string}
	 */
	emailAddress: null,

	/**
	 * The name of the contact, may be null.
	 * ^optional
	 * @type {string}
	 */
	name: null
};
