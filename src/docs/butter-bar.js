/**
 * @class
 * This namespace contains methods for showing informative messages to the user. In Gmail this is
 * a small yellow "butter bar" overlay near the top. In Inbox, the UI is different but the purpose
 * is the same.
 */
var ButterBar = /** @lends ButterBar */ {
  /**
   * Spawns a new message. The returned object contains a {destroy} method that can be called to remove the message.
   * @param {MessageDescriptor} options - message options
   * @return {Object}
   */
  showMessage: function() {},

  /**
   * Spawns a "Loading..." message that stays until it's destroyed. The returned object has a
   * {destroy} method that can be called to remove the message.
   * @param {LoadingMessageDescriptor} options - message options
   * @return {Object}
   */
  showLoading: function() {},

  /**
   * Spawns a new error message. The returned object contains a {destroy} method that can be
   * called to remove the message. Error messages might have a slightly different appearance than
   * {ButterBar.showMessage} depending on whether the user is using Inbox or Gmail. Error messages
   * also have a default priority of 100 instead of 0 (as in the case of {ButterBar.showMessage}).
   * @param {MessageDescriptor} options - message options
   * @return {Object}
   */
  showError: function() {},

  /**
   * Spawns a "Saving..." message that stays until it's removed. The returned object has a
   * {resolve} method that can be called to show a "Saved" confirmation message, and
   * a {reject} method that can be called to remove the message immediately with no
   * confirmation.
   * @param {SavingMessageDescriptor} options - message options
   * @return {Object}
   */
  showSaving: function() {},

  /**
   * Hides all messages created by the same app with the given messageKey.
   * @param {Object} messageKey - the key of the message to hide
   * @return {void}
   */
  hideMessage: function() {},

  /**
   * Hides any messages currently displayed by Gmail. This method is not
   * implemented in Inbox; the InboxSDK does not interact with Inbox's own
   * notifications.
   * @return {void}
   */
  hideGmailMessage: function() {}
};

/**
 * @class
 * This type is used to describe a message for ButterBar to show.
 */
var MessageDescriptor = /** @lends MessageDescriptor */ {
  /**
   * Text to show.
   * @type {string}
   */
  text: null,

  /**
   * String to use as the innerHTML of the ButterBar instead of using the given text.
   * ^optional
   * @type {string}
   */
  html: null,

  /**
   * HTML element to insert into the ButterBar instead of using the given text.
   * ^optional
   * @type {HTMLElement}
   */
  el: null,

  /**
   * String to add as a css class to the ButterBar container element.
   * ^optional
   * @type {string}
   */
  className: null,

  /**
   * Messages with lower priorities won't interrupt a currently displayed message.
   * ^optional
   * ^default=0
   * @type {number}
   */
  priority: null,

  /**
   * Number of milliseconds the message is displayed before going away on its own.
   * ^optional
   * ^default=15000
   * @type {number}
   */
  time: null,

  /**
   * If true, the message will immediately disappear if the user navigates to
   * another route view.
   * ^optional
   * ^default=true
   * @type {boolean}
   */
  hideOnViewChanged: null,

  /**
   * Whether this message should re-appear after being interrupted by another
   * message.
   * ^optional
   * ^default=false
   * @type {boolean}
   */
  persistent: null,

  /**
   * If a new message has the same messageKey as the current message, then the
   * current message will always be destroyed, regardless of its priority.
   * ^optional
   * @type {Object}
   */
  messageKey: null,

  /**
   * An array of buttons to support functionality in addition to the preview functionality
   * ^optional
   * @type {Array.<MessageButtonDescriptor>}
   */
  buttons: null
};

/**
 * @class
 * This type is used to describe the buttons for ButterBar to show.
 */
var MessageButtonDescriptor = /** @lends MessageButtonDescriptor */ {
  /**
   * This is called when a button is clicked and gets passed an event object.
   * @type {func(event)}
   */
  onClick: null,

  /**
   * Text of the button.
   * @type {string}
   */
  title: null
};

/**
 * @class
 * This type is used to describe the messages for {ButterBar.showLoading} to show
 */
var LoadingMessageDescriptor = /** @lends LoadingMessageDescriptor */ {
  /**
   * Text shown while the loading is ongoing.
   * ^optional
   * ^default='Loading...'
   * @type {string}
   */
  text: null,

  /**
   * String to use as the innerHTML of the ButterBar instead of using the given text.
   * ^optional
   * @type {string}
   */
  html: null,

  /**
   * HTML element to insert into the ButterBar instead of using the given text.
   * ^optional
   * @type {HTMLElement}
   */
  el: null,

  /**
   * String to add as a css class to the ButterBar container element.
   * ^optional
   * @type {string}
   */
  className: null,

  /**
   * Messages with lower priorities won't interrupt a currently displayed message.
   * Loading messages default to a lower priority than other message types.
   * ^optional
   * ^default=-3
   * @type {number}
   */
  priority: null,

  /**
   * If true, the message will immediately disappear if the user navigates to
   * another route view.
   * ^optional
   * ^default=true
   * @type {boolean}
   */
  hideOnViewChanged: null,

  /**
   * Whether this message should re-appear after being interrupted by another
   * message.
   * ^optional
   * ^default=true
   * @type {boolean}
   */
  persistent: null,

  /**
   * If a new message has the same messageKey as the current message, then the
   * current message will always be destroyed, regardless of its priority. Sets
   * the {messageKey} of both the initial message and the confirmation message.
   * ^optional
   * @type {Object}
   */
  messageKey: null
};

/**
 * @class
 * This type is used to describe the buttons for {ButterBar.showSaving} to show
 */
var SavingMessageDescriptor = /** @lends SavingMessageDescriptor */ {
  /**
   * Text shown while the save is ongoing.
   * ^optional
   * ^default='Saving...'
   * @type {string}
   */
  text: null,

  /**
   * String to use as the innerHTML of the ButterBar instead of using the given text.
   * ^optional
   * @type {string}
   */
  html: null,

  /**
   * HTML element to insert into the ButterBar instead of using the given text.
   * ^optional
   * @type {HTMLElement}
   */
  el: null,

  /**
   * String to add as a css class to the ButterBar container element.
   * ^optional
   * @type {string}
   */
  className: null,

  /**
   * Text shown when the save is complete.
   * ^optional
   * ^default='Saved'
   * @type {string}
   */
  confirmationText: null,

  /**
   * Messages with lower priorities won't interrupt a currently displayed message.
   * ^optional
   * ^default=0
   * @type {number}
   */
  priority: null,

  /**
   * Number of milliseconds the initial message is shown unless interrupted by the
   * confirmation message.
   * ^optional
   * ^default=Infinity
   * @type {number}
   */
  time: null,

  /**
   * Number of milliseconds the confirmation text is shown.
   * confirmation text.
   * ^optional
   * ^default=1000
   * @type {number}
   */
  confirmationTime: null,

  /**
   * Whether or not to show the confirmation message when the initial message is
   * resolved.
   * ^optional
   * ^default=true
   * @type {boolean}
   */
  showConfirmation: null,

  /**
   * If true, the message will immediately disappear if the user navigates to
   * another route view.
   * ^optional
   * ^default=true
   * @type {boolean}
   */
  hideOnViewChanged: null,

  /**
   * Whether this message should re-appear after being interrupted by another
   * message.
   * ^optional
   * ^default=true
   * @type {boolean}
   */
  persistent: null,

  /**
   * If a new message has the same messageKey as the current message, then the
   * current message will always be destroyed, regardless of its priority. Sets
   * the {messageKey} of both the initial message and the confirmation message.
   * ^optional
   * @type {Object}
   */
  messageKey: null
};
