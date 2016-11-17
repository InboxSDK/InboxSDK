/* @flow */

import {defn} from 'ud';
import includes from 'lodash/includes';
import closest from 'closest-ng';

function md<T>(value: T): {value: T, configurable: boolean} {
  return {value, configurable: true};
}

// These are basically all the keys that trigger some action in thread list
// views and thread views that we don't want to be triggerable while a custom
// view is open. Key combos which affect things still visible on the screen or
// navigate to a new view are still allowed.

const blockedAnyModKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Enter'];

// These are only necessary for Safari
const blockedKeyIdentifiers = ['Left', 'Right', 'Up', 'Down'];

const blockedAnyModCharacters = '!#[]{}_+=-;:\r\n1234567890`~';
const blockedNoModCharacters = ',xsyemrafz.ujkpnl';
const blockedShiftCharacters = 'parfniut';

const handler = defn(module, function(event: KeyboardEvent) {
  // If the key is in a blacklist and it originated while a custom view is
  // present, then maim the event object before Gmail or Inbox sees it.
  if (!document.body.classList.contains('inboxsdk__custom_view_active')) return;

  const key = event.key || /* safari*/String.fromCharCode(event.which || event.keyCode);
  if (
    includes(blockedAnyModKeys, key) ||
    /* safari */ includes(blockedKeyIdentifiers, (event:any).keyIdentifier) ||
    includes(blockedAnyModCharacters, key) ||
    (
      (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) &&
      includes(blockedNoModCharacters, key)
    ) ||
    (
      (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) &&
      includes(blockedShiftCharacters, key.toLowerCase())
    )
  ) {
    if (closest((event.target: any), 'input, [contenteditable]')) return;

    Object.defineProperties(event, {
      altKey: md(false),
      ctrlKey: md(false),
      shiftKey: md(false),
      metaKey: md(false),

      charCode: md(92),
      code: md('Backslash'),
      key: md('\\'),
      keyCode: md(92),
      which: md(92)
    });
  }
});

export default function setupCustomViewEventAssassin() {
  document.addEventListener('keydown', handler, true);
}
