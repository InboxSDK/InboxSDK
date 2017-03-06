/* @flow */

import type {PageParserTreeOptions} from 'page-parser-tree';

import Logger from '../../lib/logger';
import censorHTMLtree from '../../../common/censor-html-tree';
import t from 'transducers.js';
import find from 'lodash/find';
import uniq from 'lodash/uniq';
import closest from 'closest-ng';

const pageParserOptions: PageParserTreeOptions = {
  tags: {
    message: {
      ownedBy: ['thread']
    },
    attachmentCard: {
      ownedBy: ['message', 'threadRow', 'bundleRow']
    },
    inlineCompose: {
      ownedBy: ['thread']
    },
    searchAutocomplete: {
      ownedBy: ['searchBar']
    }
  },
  finders: {
    thread: {
      fn(root) {
        return root.querySelectorAll('div[aria-expanded=true][data-item-id*="#gmail:thread-"], div.scroll-list-item-open[data-item-id*="#gmail:thread-"]');
      }
    },
    message: {
      fn(root) {
        return root.querySelectorAll('div[role=listitem][aria-expanded][data-msg-id*="msg-"]');
      }
    },
    attachmentCard: {
      fn(root) {
        return root.querySelectorAll(`
          div[data-msg-id] section > div > div[tabindex][title],
          div[jsaction*="update_chip_carousel_arrows"] div[role=listitem][tabindex][jsaction]
        `);
      }
    },
    attachmentOverlay: {
      fn: (function() {
        const _t = t.compose(
          t.filter(iframe => iframe.style.display !== 'none'),
          t.mapcat(iframe =>
            Array.from(iframe.contentDocument.querySelectorAll('div[role=dialog]:not([aria-hidden=true])'))
          )
        );

        return root => {
          return t.toArray(Array.from(root.querySelectorAll('iframe[frameborder]:not([src])')), _t);
        };
      })()
    },
    nativeDrawer: {
      fn(root) {
        const drawerUploadFilesBtn = root.querySelector('div[jsaction="global.exit_full_screen"] div[role=dialog][aria-busy=true] div[role=link][jsaction$=".open_local_file_picker"]');
        if (drawerUploadFilesBtn) {
          const drawer = closest(drawerUploadFilesBtn, '[role=dialog]');
          if (drawer) return [drawer];
        }
        return [];
      }
    },
    searchBar: {
      interval: (count, timeRunning) =>
        (count === 0 && timeRunning < 60*1000) ? 300 : 2*60*1000,
      fn(root) {
        return root.querySelectorAll('nav[role=banner] div[jsaction*="scroll_to_top"] > :last-child > div:not(:empty)');
      }
    },
    searchAutocomplete: {
      fn(root) {
        return root.querySelectorAll('div[jsaction*="clickonly:global.empty_space_click"] div[role=listbox]');
      }
    },
    chatSidebar: {
      interval: count => count === 0 ? 5*1000 : 120*1000,
      fn(root) {
        return [root.querySelector('#in')].filter(Boolean);
      }
    },
    appToolbarLocation: {
      interval: (count, timeRunning) =>
        (count === 0 && timeRunning < 60*1000) ? 300 : 2*60*1000,
      fn(root) {
        const chatToggle = root.querySelector('div[role=button][jsaction*="global.toggle_chat_roster"]');
        const appToolbarLocation = chatToggle ? (chatToggle:any).parentElement.parentElement.parentElement : null;
        return appToolbarLocation ? [appToolbarLocation] : [];
      }
    },

    inlineCompose: {
      fn(root) {
        const inlineComposesByPopoutBtn = Array.prototype.filter.call(
          root.querySelectorAll('div[role=main] div[role=list] div[role=listitem] div[jsvs] button[jsaction$=".quick_compose_popout_mole"]'),
          el => el.style.display !== 'none'
        ).map(el => closest(el, '[jsvs]'));

        const inlineComposesByBody = Array.prototype.map.call(
          root.querySelectorAll('div[role=main] div[role=list] ~ div div[jsvs] div[role=textbox][contenteditable=true][tabindex="0"], div[role=main] div[role=listitem][aria-multiselectable] div[jsvs] div[role=textbox][contenteditable=true][tabindex="0"]'),
          el => closest(el, '[jsvs]')
        );

        // The above are currently expected to match, though they don't match
        // for all of our historical data.

        const inlineComposes = uniq(inlineComposesByPopoutBtn.concat(inlineComposesByBody))
        return inlineComposes;
      }
    },
    regularCompose: {
      fn(root) {
        return Array.prototype.filter.call(
          root.querySelectorAll('div[role=dialog]'),
          el =>
            el.querySelector('div[jsaction^="compose"][jsaction$=".focus_mole"]') &&
            !closest(el, 'div[tabindex][jsaction*="exit_full_screen"]')
        );
      }
    },
    fullscreenCompose: {
      fn(root) {
        return Array.prototype.filter.call(
          root.querySelectorAll('div[tabindex][jsaction*="exit_full_screen"] div[role=dialog]'),
          el =>
            el.querySelector('div[jsaction^="compose"][jsaction$=".focus_mole"]')
        );
      }
    },
  },
  watchers: [
    {sources: [null], tag: 'topRow', selectors: [
      'body',
      '[id][jsaction]',
      'div[jsaction]:not([role])',
      '*',
      {$or: [
        [
          '[role=main]',
        ],
        [
          ':not([role])',
          '*',
          '[role=main]'
        ]
      ]},
      '[role=application]',
      '[role=list]',
      '*',
      '*',
      '.scroll-list-section-body',
      '[role=listitem]'
    ]},
    {sources: ['topRow'], tag: 'bundleRow', selectors: [
      {$filter: el => !/#gmail:thread-/.test(el.getAttribute('data-item-id')||'')}
    ]},
    {sources: ['topRow'], tag: 'threadRow', selectors: [
      {$filter: el => /#gmail:thread-/.test(el.getAttribute('data-item-id') || '')}
    ]},
    {sources: ['bundleRow'], tag: 'threadRow', selectors: [
      {$watch: {attributeFilter: ['aria-expanded'], cond: '[aria-expanded=true]'}},
      '[role=list]',
      '*',
      ':not([id])',
      '*',
      '*',
      '[role=listitem]'
    ]},
    {sources: ['threadRow'], tag: 'thread', selectors: [
      {$watch: {attributeFilter: ['aria-expanded', 'class'], cond: '[aria-expanded=true], .scroll-list-item-open'}}
    ]},
    {sources: ['thread'], tag: 'message', selectors: [
      '*',
      ':not([role=heading])',
      '[role=list]',
      'div',
      {$watch: {attributeFilter: ['role', 'data-msg-id'], cond: '[role=listitem][data-msg-id]'}}
    ]},

    {sources: ['message'], tag: 'attachmentCard', selectors: [
      '*',
      '*',
      'section',
      '*',
      {$filter: el => el.style.display !== 'none'},
      'div[tabindex]',
      {$filter: el => el.style.display !== 'none'}
    ]},
    {sources: ['bundleRow', 'threadRow'], tag: 'attachmentCard', selectors: [
      '*',
      '[jsaction]',
      '[role=list][jsaction]',
      '*',
      'div[role=listitem]',
      {$watch: {attributeFilter: ['tabindex'], cond: '[tabindex]'}},
      {$filter: el => el.style.display !== 'none'}
    ]},
    {sources: [null], tag: 'attachmentOverlay', selectors: [
      'body',
      'iframe[id][frameborder]:not([src])',
      {$map: el => (el:any).contentDocument.body},
      'div[aria-label][role=dialog]',
      {$watch: {attributeFilter: ['aria-hidden'], cond: ':not([aria-hidden=true])'}}
    ]},

    {sources: [null], tag: 'chatSidebar', selectors: [
      'body',
      '[id][jsaction]',
      'div[id]',
      'div[class]',
      'div.in#in'
    ]},

    {sources: [null], tag: 'searchAutocomplete', selectors: [
      'body',
      '[id][jsaction]',
      '[id][jsaction]',
      'div[class]',
      'div[class]',
      '[role=listbox]'
    ]},

    {sources: ['thread'], tag: 'inlineCompose', selectors: [
      '*',
      ':not([role=heading])',
      ':not([role=list])',
      '*',
      '[jsvs]',
      {$map(el) {
        // <2016-11-02 support
        const oldButton = find(el.children, child => child.nodeName === 'BUTTON');
        if (oldButton) return oldButton;

        const buttonEl = el.querySelector('div[jsaction="global.none"] > div[role=button]');
        if (buttonEl) return (buttonEl.parentElement:any);

        Logger.error(new Error("inline compose button not found"), {
          el,
          html: censorHTMLtree(el)
        });
      }},
      {$watch: {attributeFilter: ['style'], cond: el => el.style.display !== 'none'}},
      {$map: el => (el.parentElement:any)}
    ]},
    {sources: [null], tag: 'regularCompose', selectors: [
      'body',
      'div[id][jsaction]',
      'div[id][class]:not([role])',
      'div[class]',
      'div[id]',
      'div[jstcache][class]:not([aria-hidden]):not([tabindex])',
      {$map(el) {
        const composeEl = el.querySelector('div[role=dialog]');
        if (!composeEl) {
          Logger.error(new Error("compose dialog element not found"), {
            html: censorHTMLtree(el)
          });
        }
        return composeEl;
      }}
    ]},
    {sources: [null], tag: 'fullscreenCompose', selectors: [
      'body',
      '[id][jsaction]',
      'div[id]:not([jsaction])',
      'div[tabindex][jsaction*="exit_full_screen"]',
      '*',
      '*',
      '*',
      '*',
      '*',
      '[role=dialog]:not(.inboxsdk__drawer_view)'
    ]},
  ]
};

export default pageParserOptions;
