/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import Logger from '../../../../lib/logger';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import selectorStream from '../../../../lib/dom/selectorStream';

export default function watcher(root: Document=document): Kefir.Stream<ElementWithLifetime> {
  const selector = [
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
    {$or: [
      [
        {$watch: '[role=listitem][aria-expanded=true]:not([data-item-id*="#gmail:thread-"])'},
        '[role=list]',
        '*',
        ':not([id])',
        '*',
        '*',
        '[role=listitem]'
      ],
      [
        '[role=listitem][data-item-id*="#gmail:thread-"]'
      ]
    ]}
  ];

  return selectorStream(selector)(root.body);
}
