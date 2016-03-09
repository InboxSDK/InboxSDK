/**
* @class
* This namespace allows you to interact with Gmail and Inbox conversations (typically called threads). The fundamental
* views you interact with are ThreadView and MessageView and there is a 1 to many relationship between them. The functions
* in Conversations.* allow you to obtain these views which you can then further manipulate.
*
* It's important to note that ThreadViews and MessageViews can be navigated to in various ways by the user depending on their
* email client and their settings (i.e. preview pane on in Gmail). This is abstracted completely away from you so you can just
* focus on manipulating the views once they are given to you.
*
* Finally, when a ThreadView loads, you're not guranteed that every MessageView in it is also loaded. When you call
* ThreadView.getMessageViews it will return all MessageViews, but its important to remember that the MessageViews might not
* be loaded. MessageViews can be in several states. Consult the {MessageView} documentation to learn about what
* functionality is available in each state.
*/
var Conversations = /** @lends Conversations */{

	/**
	* Registers your handler to be called when the user navigates to a ThreadView. Your handler is given a
	* ThreadView which you can then further manipulate.
	* @param {func(ThreadView)} handler - The handler to call when a ThreadView is displayed. This handler
	* is passed one parameter, a ThreadView.
	* @return {void}
	*/
	registerThreadViewHandler: function(){},

	/**
	* Registers your handler to be called when a MessageView is displayed. Your handler is given a
	* MessageView which you can then further manipulate.
	*
	* IMPORTANT: Your handler will only be called for {MessageView}s that are "loaded". See docs for
	* {MessageView} to understand the distinction.
	* @param {func(MessageView)} handler - The handler to call when a MessageView is displayed.
	* @return {void}
	*/
	registerMessageViewHandler: function(){},

	/**
	* Registers your handler to be called when the user navigates to a MessageView. Your handler is given a
	* MessageView which you can then further manipulate.
	*
	* IMPORTANT: Your handler will be called for MessageViews that are both "loaded" and "unloaded". See docs for
	* {MessageView} to understand the distinction.
	* @param {func(MessageView)} handler - The handler to call when a message view is displayed.
	* @return {void}
	*/
	registerMessageViewHandlerAll: function(){}

};

/**
* The various UI states a MessageView can be in.
* @class
*/
var MessageViewViewStates = /**@lends MessageViewViewStates */{
	/**
	* In this state none of the message is visible except for the outline of its existence.
	* @type string
	*/
	'HIDDEN': "HIDDEN",
	/**
	* In this state most of the body of the message is not visible and some recipients may not be showing.
	* @type string
	*/
	'COLLAPSED': "COLLAPSED",
	/**
	* In this state all of the message is visible including the body.
	* @type string
	*/
	'EXPANDED': "EXPANDED"
};

/**
* The locations that a button can be added to on a MessageView.
* @class
*/
var MessageViewToolbarSectionNames = /**@lends MessageViewToolbarSectionNames */{
	/**
	* The button will be added to the message's "More" dropdown menu.
	* @type string
	*/
	"MORE": "MORE"
};
