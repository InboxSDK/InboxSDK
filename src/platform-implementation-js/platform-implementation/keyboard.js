'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');


var KeyboardShortcutHandle = require('../views/keyboard-shortcut-handle');

var memberMap = new Map();

/**
 * @class
 * This namespace allows you to setup keyboard shortcuts that your application can response to.
 */
var Keyboard = function(appId, appName, appIconUrl, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.appName = appName;
    members.appIconUrl = appIconUrl;
    members.driver = driver;
};

_.extend(Keyboard.prototype, /** @lends Keyboard */ {

  /**
   * This method creates a shortcut handle. A shortcut handle can be used in various APIs in
   * the SDK to keyboard enable them.
   * @param  {KeyboardShortcutDescriptor} keyboardShortcutDescriptor - details of the shortcut.
   * @return {KeyboardShortcutHandle}
   */
  createShortcutHandle: function(shortcutDescriptor){
    var members = memberMap.get(this);

    var keyboardShortcutHandleDriver = members.driver.createKeyboardShortcutHandle(shortcutDescriptor, members.appId, members.appName, members.appIconUrl);
    return new KeyboardShortcutHandle(keyboardShortcutHandleDriver);
  }

});

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


module.exports = Keyboard;
