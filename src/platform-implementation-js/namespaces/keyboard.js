'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');


var KeyboardShortcutHandle = require('../views/keyboard-shortcut-handle');

var memberMap = new Map();

// documented in src/docs/
var Keyboard = function(appId, appName, appIconUrl, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.appName = appName;
    members.appIconUrl = appIconUrl;
    members.driver = driver;
};

_.extend(Keyboard.prototype, {

  createShortcutHandle(shortcutDescriptor){
    var members = memberMap.get(this);

    var keyboardShortcutHandleDriver = members.driver.createKeyboardShortcutHandle(shortcutDescriptor, members.appId, members.appName, members.appIconUrl);
    return new KeyboardShortcutHandle(keyboardShortcutHandleDriver);
  }

});

module.exports = Keyboard;
