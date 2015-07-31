/* @flow */
//jshint ignore:start

import GmailKeyboardShortcutHandle from '../views/gmail-keyboard-shortcut-handle';
import type GmailDriver from '../gmail-driver';
import type {ShortcutDescriptor} from '../../../driver-interfaces/driver';

export default function createKeyboardShortcutHandle(gmailDriver: GmailDriver, shortcutDescriptor: ShortcutDescriptor, appId: ?string, appName: ?string, appIconUrl: ?string): GmailKeyboardShortcutHandle {
	var gmailKeyboardShortcutHandle = new GmailKeyboardShortcutHandle(shortcutDescriptor.chord,  function(){
		gmailDriver.getKeyboardShortcutHelpModifier().delete(gmailKeyboardShortcutHandle);
	});

	gmailDriver.getKeyboardShortcutHelpModifier().set(gmailKeyboardShortcutHandle, shortcutDescriptor, appId, appName, appIconUrl);

	return gmailKeyboardShortcutHandle;
}
