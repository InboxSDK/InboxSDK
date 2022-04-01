import closest from 'closest-ng';
import PageParserTree from 'page-parser-tree';
import censorHTMLtree from '../../../../../common/censorHTMLtree';
import Logger from '../../../../lib/logger';

export function makePageParser(element: HTMLElement, logger: Logger) {
  return new PageParserTree(element, {
    logError(err, el) {
      const details = {
        el,
        html: el ? censorHTMLtree(el) : null,
      };
      logger.errorSite(err, details);
    },
    tags: {},
    watchers: [
      {
        // For regular composes
        sources: [null],
        tag: 'recipientsCommon',
        selectors: [
          'div',
          'div',
          'div[jsaction]',
          'div[role=region]',
          'table',
          'tbody',
          'tr',
          'td',
          'form',
          'div',
          'table.GS',
          'tbody',
          'tr.bzf',
          'td.eV',
          'div',
          'div',
        ],
      },
      {
        // For inline composes
        sources: [null],
        tag: 'recipientsCommon',
        selectors: [
          'div[role=region]',
          'table',
          'tbody',
          'tr',
          'td',
          'form',
          'div',
          'table[role=presentation]',
          'tbody',
          'tr',
          'td.Iy',
          'div.fX',
          'table.GS',
          'tbody',
          'tr.bzf',
          'td.eV',
          'div',
          'div',
        ],
      },
      {
        sources: ['recipientsCommon'],
        tag: 'toRecipient',
        selectors: [
          {
            $or: [
              [
                'div.anm[name="to"]',
                {
                  $or: [
                    [],
                    // Inline reply compose
                    ['div.aUy'],
                  ],
                },
                'div',
                'div',
                'div',
                'div',
                '[role=listbox]',
                'div',
                'div',
                'div[role=option][data-name]',
              ],
              [
                {
                  $map: (el) =>
                    el.querySelector<HTMLElement>(
                      'textarea.vO[name=to], input[name=to]'
                    ),
                },
                { $map: (el) => el.closest('tr') },
                'td.eV',
                'div',
                'div',
                '.vR',
                'input[type=hidden]',
                { $map: (el) => el.parentElement },
              ],
            ],
          },
        ],
      },
      {
        sources: ['recipientsCommon'],
        tag: 'ccRecipient',
        selectors: [
          {
            $or: [
              [
                'div.anm[name="cc"]',
                {
                  $or: [
                    [],
                    // Inline reply compose
                    ['div.aUy'],
                  ],
                },
                'div',
                'div',
                'div',
                'div',
                '[role=listbox]',
                'div',
                'div',
                'div[role=option][data-name]',
              ],
              [
                {
                  $map: (el) =>
                    el.querySelector<HTMLElement>(
                      'textarea.vO[name=cc], input[name=cc]'
                    ),
                },
                { $map: (el) => el.closest('tr') },
                'td.eV',
                'div',
                'div',
                '.vR',
                'input[type=hidden]',
                { $map: (el) => el.parentElement },
              ],
            ],
          },
        ],
      },
      {
        sources: ['recipientsCommon'],
        tag: 'bccRecipient',
        selectors: [
          {
            $or: [
              [
                'div.anm[name="bcc"]',
                {
                  $or: [
                    [],
                    // Inline reply compose
                    ['div.aUy'],
                  ],
                },
                'div',
                'div',
                'div',
                'div',
                '[role=listbox]',
                'div',
                'div',
                'div[role=option][data-name]',
              ],
              [
                {
                  $map: (el) =>
                    el.querySelector<HTMLElement>(
                      'textarea.vO[name=bcc], input[name=bcc]'
                    ),
                },
                { $map: (el) => el.closest('tr') },
                'td.eV',
                'div',
                'div',
                '.vR',
                'input[type=hidden]',
                { $map: (el) => el.parentElement },
              ],
            ],
          },
        ],
      },
    ],
    finders: {
      toRecipient: {
        fn: (root) => getRecipientChips(root, 'to'),
      },
      ccRecipient: {
        fn: (root) => getRecipientChips(root, 'cc'),
      },
      bccRecipient: {
        fn: (root) => getRecipientChips(root, 'bcc'),
      },
    },
  });
}

export function getRecipientChips(
  element: HTMLElement,
  addressType: 'to' | 'cc' | 'bcc'
): Array<HTMLElement> | NodeListOf<HTMLElement> {
  const oldRow = getOldRecipientRowForType(element, addressType);
  if (oldRow) {
    return Array.from(oldRow.querySelectorAll('.vR > input[type=hidden]')).map(
      (el) => el.parentElement!
    );
  } else {
    return element.querySelectorAll<HTMLElement>(
      `.GS .anm[name="${addressType}"] [role=listbox] [role=option][data-name]`
    );
  }
}

// getRecipientRowForType is recommended over this
export function getRecipientRowElements(element: HTMLElement): HTMLElement[] {
  return Array.prototype.filter.call(
    element.querySelectorAll<HTMLElement>(
      '.GS tr, .GS .anm[name] [role=listbox]'
    ),
    (tr) => !tr.classList.contains('inboxsdk__recipient_row')
  );
}

export function getRecipientRowForType(
  element: HTMLElement,
  addressType: 'to' | 'cc' | 'bcc'
): HTMLElement | null {
  // handling new recipients
  // https://workspaceupdates.googleblog.com/2021/10/visual-updates-for-composing-email-in-gmail.html
  return element.querySelector<HTMLElement>(
    `.GS .anm[name="${addressType}"] [role=listbox]`
  );
}

export function getOldRecipientRowForType(
  element: HTMLElement,
  addressType: 'to' | 'cc' | 'bcc'
): HTMLElement | null {
  const input = element.querySelector<HTMLElement>(
    `.GS tr textarea.vO[name="${addressType}"], .GS tr input[name="${addressType}"]`
  );
  if (input) {
    return closest(input, 'tr');
  } else {
    return null;
  }
}
