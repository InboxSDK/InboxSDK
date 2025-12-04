import * as ud from 'ud';
import get from '../../common/get-or-fail';
import KeyboardShortcutHandle from '../views/keyboard-shortcut-handle';
import type { Driver } from '../driver-interfaces/driver';
const memberMap = ud.defonce(module, () => new WeakMap());

class Keyboard {
  constructor(
    appId: string,
    appName: string | null | undefined,
    appIconUrl: string | null | undefined,
    driver: Driver,
  ) {
    const members = {
      appId,
      appName,
      appIconUrl,
      driver,
    };
    memberMap.set(this, members);
  }

  createShortcutHandle(shortcutDescriptor: {
    chord: string;
    description: string;
    orderHint?: number;
  }) {
    const members = get(memberMap, this);
    // eslint-disable-next-line prefer-const
    let { chord, description, orderHint } = shortcutDescriptor;
    if (!chord) throw new Error('Keyboard.createShortcutHandle chord missing');

    if (description == null) {
      console.error('Keyboard.createShortcutHandle chord missing');
      description = '';
    }

    const keyboardShortcutHandle = new KeyboardShortcutHandle(
      chord,
      description,
      orderHint,
    );
    members.driver.activateShortcut(
      keyboardShortcutHandle,
      members.appName,
      members.appIconUrl,
    );
    return keyboardShortcutHandle;
  }
}

export default Keyboard;
