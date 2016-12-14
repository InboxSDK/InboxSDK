/* @flow */

import * as ud from 'ud';
import get from '../../common/get-or-fail';
import KeyboardShortcutHandle from '../views/keyboard-shortcut-handle';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = ud.defonce(module, () => new WeakMap());

// documented in src/docs/
class Keyboard {
  constructor(appId: string, appName: ?string, appIconUrl: ?string, driver: Driver) {
    const members = {appId, appName, appIconUrl, driver};
    memberMap.set(this, members);
  }

  createShortcutHandle(shortcutDescriptor) {
    const members = get(memberMap, this);

    let {chord, description} = shortcutDescriptor;
    if (!chord) throw new Error('Keyboard.createShortcutHandle chord missing');
    if (description == null) {
      console.error('Keyboard.createShortcutHandle chord missing');
      description = '';
    }
    const keyboardShortcutHandle = new KeyboardShortcutHandle(chord, description);
    members.driver.activateShortcut(keyboardShortcutHandle, members.appName, members.appIconUrl);
    return keyboardShortcutHandle;
  }
}

export default ud.defn(module, Keyboard);
