'use strict';

var GmailKeyboardShortcutHandle = require('../views/gmail-keyboard-shortcut-handle');

module.exports = function(gmailDriver, shortcutDescriptor, appId, appName, appIconUrl){

	var gmailKeyboardShortcutHandle = new GmailKeyboardShortcutHandle(shortcutDescriptor.chord,  function(){
		gmailDriver.getKeyboardShortcutHelpManager().delete(gmailKeyboardShortcutHandle);
	});

	gmailDriver.getKeyboardShortcutHelpModifier().set(gmailKeyboardShortcutHandle, shortcutDescriptor, appId, appName, appIconUrl);

	return gmailKeyboardShortcutHandle;

};

