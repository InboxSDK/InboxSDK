/* @flow */

import type {PageParserTreeOptions} from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  tags: {
    message: {
      ownedBy: ['thread']
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
    }
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
  ]
};

export default pageParserOptions;
