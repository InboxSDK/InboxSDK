import closest from 'closest-ng';
import PageParserTree from 'page-parser-tree';
import censorHTMLtree from '../../../../../common/censorHTMLtree';
import Logger from '../../../../lib/logger';

export function makePageParser(element: HTMLElement, logger: Logger) {
  return new PageParserTree(element, {
    logError(err, el) {
      const details = {
        el,
        html: el ? censorHTMLtree(el) : null
      };
      logger.errorSite(err, details);
    },
    tags: {},
    watchers: [
      {
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
          'div'
        ]
      },
      {
        sources: ['recipientsCommon'],
        tag: 'toRecipient',
        selectors: [
          {
            $or: [
              [
                'div.anm[name="to"]',
                'div',
                'div',
                'div',
                'div',
                '[role=listbox]',
                'div',
                'div',
                'div[role=option][data-name]'
              ],
              [
                {
                  $map: el =>
                    el.querySelector<HTMLElement>(
                      'textarea.vO[name=to], input[name=to]'
                    )
                },
                { $map: el => el.closest('tr') },
                'td.eV',
                'div',
                'div',
                '.vR',
                'input[type=hidden]',
                { $map: el => el.parentElement }
              ]
            ]
          }
        ]
      },
      {
        sources: ['recipientsCommon'],
        tag: 'ccRecipient',
        selectors: [
          {
            $or: [
              [
                'div.anm[name="cc"]',
                'div',
                'div',
                'div',
                'div',
                '[role=listbox]',
                'div',
                'div',
                'div[role=option][data-name]'
              ],
              [
                {
                  $map: el =>
                    el.querySelector<HTMLElement>(
                      'textarea.vO[name=cc], input[name=cc]'
                    )
                },
                { $map: el => el.closest('tr') },
                'td.eV',
                'div',
                'div',
                '.vR',
                'input[type=hidden]',
                { $map: el => el.parentElement }
              ]
            ]
          }
        ]
      },
      {
        sources: ['recipientsCommon'],
        tag: 'bccRecipient',
        selectors: [
          {
            $or: [
              [
                'div.anm[name="bcc"]',
                'div',
                'div',
                'div',
                'div',
                '[role=listbox]',
                'div',
                'div',
                'div[role=option][data-name]'
              ],
              [
                {
                  $map: el =>
                    el.querySelector<HTMLElement>(
                      'textarea.vO[name=bcc], input[name=bcc]'
                    )
                },
                { $map: el => el.closest('tr') },
                'td.eV',
                'div',
                'div',
                '.vR',
                'input[type=hidden]',
                { $map: el => el.parentElement }
              ]
            ]
          }
        ]
      }
    ],
    finders: {
      toRecipient: {
        fn: root => {
          const oldRow = getOldRecipientRowForType(root, 'to');
          if (oldRow) {
            return Array.from(
              oldRow.querySelectorAll('.vR > input[type=hidden]')
            ).map(el => el.parentElement!);
          } else {
            return root.querySelectorAll(
              '.GS .anm[name="to"] [role=listbox] [role=option][data-name]'
            );
          }
        }
      },
      ccRecipient: {
        fn: root => {
          const oldRow = getOldRecipientRowForType(root, 'cc');
          if (oldRow) {
            return Array.from(
              oldRow.querySelectorAll('.vR > input[type=hidden]')
            ).map(el => el.parentElement!);
          } else {
            return root.querySelectorAll(
              '.GS .anm[name="cc"] [role=listbox] [role=option][data-name]'
            );
          }
        }
      },
      bccRecipient: {
        fn: root => {
          const oldRow = getOldRecipientRowForType(root, 'bcc');
          if (oldRow) {
            return Array.from(
              oldRow.querySelectorAll('.vR > input[type=hidden]')
            ).map(el => el.parentElement!);
          } else {
            return root.querySelectorAll(
              '.GS .anm[name="bcc"] [role=listbox] [role=option][data-name]'
            );
          }
        }
      }
    }
  });
}

// getRecipientRowForType is recommended over this
export function getRecipientRowElements(element: HTMLElement): HTMLElement[] {
  return Array.prototype.filter.call(
    element.querySelectorAll<HTMLElement>(
      '.GS tr, .GS .anm[name] [role=listbox]'
    ),
    tr => !tr.classList.contains('inboxsdk__recipient_row')
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
