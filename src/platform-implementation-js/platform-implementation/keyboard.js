'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');
var Map = require('es6-unweak-collections').Map;


var KeyboardShortcutHandle = require('../views/keyboard-shortcut-handle');

var memberMap = new Map();

/**
* @class
*/
var Keyboard = function(appId, appIconUrl, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.appIconUrl = appIconUrl;
    members.driver = driver;
};

_.extend(Keyboard.prototype, /** @lends Keyboard */ {

    /*
     * keyboard shortcut descriptor
     *  {
     *      chord: string,
     *      description: string
     *  }
     *
     *  chord is what the user types. Simultaneous keypresses can be defined with "+".
     *  For multi-key chords (like Gmail's) include a space between the keys, i.e. "g i".
     *
     *  description is the text that will show up in Gmail's keyboard shortcut help
     *
     *  returns a KeyboardShortcutHandle
     */

  createShortcutHandle: function(shortcutDescriptor){
    var members = memberMap.get(this);

    var keyboardShortcutHandleDriver = members.driver.createKeyboardShortcutHandle(shortcutDescriptor, members.appId, members.appIconUrl);
    return new KeyboardShortcutHandle(keyboardShortcutHandleDriver);
  }

});



module.exports = Keyboard;
