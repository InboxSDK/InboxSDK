/**
 * @class
 * This namespace contains methods and types related to the currently logged in user.
 */
var User = /** @lends User */ {
  /**
   * Get the email address of the currently logged in user.
   * @return {string}
   */
  getEmailAddress: function() {},

  /**
   * Is conversation view disabled by the user
   * @return {boolean}
   */
  isConversationViewDisabled: function() {},

  /**
   * Get the current locale code of Gmail
   * @return {string}
   */
  getLanguage: function() {},

  /**
   * Get the details of all of the user's accounts from the account switcher.
   * @return {Contact[]}
   */
  getAccountSwitcherContactList: function() {}
};
