/* @flow */

import type {PageParserTreeOptions} from 'page-parser-tree';
import t from 'transducers.js';

const pageParserOptions: PageParserTreeOptions = {
  tags: {
    message: {
      ownedBy: ['thread']
    },
    attachmentCard: {
      ownedBy: ['message', 'threadRow', 'bundleRow']
    },
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
  ]
};

export default pageParserOptions;
