/**
 * @class
 * This namespace allows you to setup keyboard shortcuts that your application can response to.
 */
var Keyboard = /** @lends Keyboard */ {

  /**
   * This method creates a shortcut handle. A shortcut handle can be used in various APIs in
   * the SDK to keyboard enable them.
   * @param  {KeyboardShortcutDescriptor} keyboardShortcutDescriptor - details of the shortcut.
   * @return {KeyboardShortcutHandle}
   */
  createShortcutHandle: function(){}

};

/**
 * @class
 * Describes a keyboard shortcut combination
 */
var KeyboardShortcutDescriptor = /** @lends KeyboardShortcutDescriptor */ {

  /**
   * The keys the user has to press to activate the shortcut. Simultaneous
   * keypresses can be defined with "+". For multi-key chords like Gmail's,
   * include a space between the keys, i.e. "g i". Syntax matches the
   * <a href="https://www.npmjs.com/package/combokeys">combokeys</a> library.
   * @type {string}
   */
  chord: null,

  /**
   * The description text that shows up in Gmail's keyboard shortcut help (when the user presses '?').
   * @type {string}
   */
  description: null,
};
