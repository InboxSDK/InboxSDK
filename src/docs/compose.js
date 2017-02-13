/**
* @class
* This namespace contains methods and types related to adding your application elements to the Gmail or Inbox Compose UI.
* The compose UI has two variants. The New Compose UI appears when users are composing new messages and appear as windows
* above the rest of the app content. The second, the Reply UI, appears when users are replying to existing messages
* from the message they are replying to. This namespace handles both of these variants equivalently.
*
* The {ComposeView} type is how you interact with compose windows in Gmail and Inbox. The most common way to get
* access to a compose view is to use the {Compose.registerComposeViewHandler()} method which calls you back
* with every existing {ComposeView} and all future {ComposeView}s. From there a typical application will
* modify the {ComposeView} as needed by adding buttons, adding content to the message, or accessing the recipient data.
*/
var Compose = /** @lends Compose */ {

  /**
  * Register a handler to be called for every existing ComposeView as well as for all future ComposeViews
  * that may come into existence. This method is the preferred way to add your application to every compose
  * area such as a new compose window or inline reply compose areas. This function returns another function
  * that can be used to unregister - simply call the function to unregister this handler.
  * ^gmail
  * ^inbox
  * @param {func(ComposeView)} handler - The function to be called.
  * @return {function}
  */
  registerComposeViewHandler: function(){},

  /**
   * Opens a new compose view. Any handlers you've registered for ComposeViews will be called as well. Returns
   * a promise which will resolve with the new ComposeView once it has opened.
   * ^gmail
   * ^inbox
   * @return {Promise.<ComposeView>}
   */
  openNewComposeView: function(){},

  openDraftByMessageID: function(){},

  getComposeView: function(){}
};
