import escape from 'lodash/escape';
import kefirStopper from 'kefir-stopper';
import type { Stopper } from 'kefir-stopper';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import type KeyboardShortcutHandle from '../../../views/keyboard-shortcut-handle';

export default class KeyboardShortcutHelpModifier {
  _appId: string | null | undefined;
  _appName: string | null | undefined;
  _appIconUrl: string | null | undefined;
  _stopper: Stopper;
  _shortcuts: Set<KeyboardShortcutHandle>;

  constructor() {
    this._appId = null; // TODO have these passed to the constructor
    this._appName = null;
    this._appIconUrl = null;

    this._stopper = kefirStopper();
    this._shortcuts = new Set();
    this._monitorKeyboardHelp();
  }

  destroy() {
    this._stopper.destroy();
    this._shortcuts.clear();
  }

  set(
    keyboardShortcutHandle: KeyboardShortcutHandle,
    appId: string,
    appName: string | null | undefined,
    appIconUrl: string | null | undefined,
  ) {
    this._initializeAppValues(appId, appName!, appIconUrl!);

    this._shortcuts.add(keyboardShortcutHandle);
  }

  delete(keyboardShortcutHandle: KeyboardShortcutHandle) {
    this._shortcuts.delete(keyboardShortcutHandle);
  }

  _initializeAppValues(
    appId: string,
    appName: string | null | undefined,
    appIconUrl: string | null | undefined,
  ) {
    if (!this._appId) {
      this._appId = appId;
    }

    if (!this._appName) {
      this._appName = appName;
    }

    if (!this._appIconUrl) {
      this._appIconUrl = appIconUrl;
    }
  }

  _monitorKeyboardHelp() {
    makeElementChildStream(document.body)
      .map((event) => event.el)
      .filter((node) => node && node.classList && node.classList.contains('wa'))
      .flatMap((node) =>
        makeMutationObserverChunkedStream(node, {
          attributes: true,
          attributeFilter: ['class'],
        })
          .filter(() => !node.classList.contains('aou'))
          .toProperty(() => null)
          .map(() => node),
      )
      .takeUntilBy(this._stopper)
      .onValue((node) => this._renderHelp(node));
  }

  _renderHelp(node: HTMLElement) {
    if (this._shortcuts.size === 0) {
      return;
    }

    const sortedShortcuts = Array.from(this._shortcuts).sort(
      sortByOrderHintAsc,
    );

    var header = this._renderHeader();
    var table = this._renderTable();

    var bodies = table.querySelectorAll<HTMLElement>('tbody tbody');

    sortedShortcuts.forEach((keyboardShortcutHandle, index) => {
      this._renderShortcut(bodies[index % 2], keyboardShortcutHandle);
    });

    const firstHeader = querySelector(node, '.aov');
    const parent = firstHeader.parentElement;
    if (!parent) throw new Error('Could not find parent');
    parent.insertBefore(header, firstHeader);
    parent.insertBefore(table, firstHeader);
  }

  _renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.setAttribute('class', 'aov  aox');
    header.innerHTML = [
      '<div class="aow">',
      '<span class="inboxsdk__shortcutHelp_title">',
      escape(this._appName || this._appId!) + ' keyboard shortcuts',
      '</span>',
      '</div>',
    ].join('');

    if (this._appIconUrl) {
      const img = document.createElement('img');
      if (this._appIconUrl) {
        img.src = this._appIconUrl;
      }
      img.setAttribute('class', 'inboxsdk__icon');

      const title = querySelector(header, '.inboxsdk__shortcutHelp_title');
      title.insertBefore(img, title.firstChild);
    }

    return header;
  }

  _renderTable(): HTMLElement {
    var table = document.createElement('table');
    table.setAttribute('cellpadding', '0');
    table.setAttribute('class', 'cf wd inboxsdk__shortcutHelp_table');

    table.innerHTML = [
      '<tbody>',
      '<tr>',
      '<td class="Dn">',
      '<table cellpadding="0" class="cf">',
      '<tbody>',
      '<tr><th>&nbsp;</th><th>&nbsp;</th></tr>',
      '</tbody>',
      '</table>',
      '</td>',
      '<td class="Dn">',
      '<table cellpadding="0" class="cf">',
      '<tbody>',
      '<tr><th>&nbsp;</th><th>&nbsp;</th></tr>',
      '</tbody>',
      '</table>',
      '</td>',
      '</tr',
      '</tbody>',
    ].join('');

    return table;
  }

  _renderShortcut(
    tableBody: HTMLElement,
    keyboardShortcutHandle: KeyboardShortcutHandle,
  ) {
    var shortcutRow = document.createElement('tr');
    shortcutRow.innerHTML = [
      '<td class="wg Dn"> ',
      _getShortcutHTML(keyboardShortcutHandle.chord),
      '</td>',
      '<td class="we Dn"> ',
      escape(keyboardShortcutHandle.description || ''),
      '</td>',
    ].join('');

    tableBody.appendChild(shortcutRow);
  }
}

function _getShortcutHTML(chord: string): string {
  const retArray = [];

  const parts = chord.split(/[\s+]/g);
  const separators = chord.match(/[\s+]/g);

  for (var ii = 0; ii < parts.length; ii++) {
    retArray.push(
      '<span class="wh">' + escape(_getAngledBracket(parts[ii])) + '</span>',
    );
    if (separators && separators[ii]) {
      retArray.push(_getSeparatorHTML(separators[ii]));
    }
  }

  retArray.push(' :');

  return retArray.join('');
}

function _getAngledBracket(chordChar: string): string {
  switch (chordChar.toLowerCase()) {
    case 'shift':
      return '<Shift>';
    case 'ctrl':
      return '<Ctrl>';
    case 'alt':
      return '<Alt>';
    case 'meta':
    case 'command':
      return '<⌘>';
    case 'mod':
      // Operating system check copied from Combokeys.
      // https://github.com/avocode/combokeys/blob/0b80e13cf7e5217c5b4fbd393289a87b1f48f7cc/helpers/special-aliases.js#L14
      return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '<⌘>' : '<Ctrl>';
    default:
      return chordChar;
  }
}

function _getSeparatorHTML(separator: string): string {
  switch (separator) {
    case ' ':
      return '<span class="wb">then</span> ';
    case '+':
      return ' <span class="wb">+</span> ';
    default:
      return '';
  }
}

// Sort: items with orderHint first (ascending), then items without
function sortByOrderHintAsc(
  a: KeyboardShortcutHandle,
  b: KeyboardShortcutHandle,
): number {
  if (a.orderHint == null && b.orderHint == null) {
    return 0;
  }
  if (a.orderHint == null) {
    return 1;
  }
  if (b.orderHint == null) {
    return -1;
  }
  return a.orderHint - b.orderHint;
}
