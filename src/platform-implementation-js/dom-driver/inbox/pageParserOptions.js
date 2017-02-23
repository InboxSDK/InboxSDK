/* @flow */

import type {PageParserTreeOptions} from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  // logError(err, el) {
	// },
  tags: {
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
  ],
  finders: {}
};

export default pageParserOptions;
