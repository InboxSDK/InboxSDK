/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import selectorStream from '../../../../lib/dom/selectorStream';

export default function watcher(root: Document=document): Kefir.Observable<ElementWithLifetime> {
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
        '[role=listitem]:not([data-item-id*="#gmail:thread-"])',
        {$watch: '[aria-expanded=true]'},
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
