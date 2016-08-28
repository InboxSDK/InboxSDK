/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import selectorStream from '../../../../lib/dom/selectorStream';

export default function watcher(root: Document=document): Kefir.Observable<ElementWithLifetime> {
  const selector = [
    '[id][jsaction]',
    'div[id][class]',
    'div[class]',
    'div.in#in',
    {$map: el => (el:any).parentElement}
  ];

  return selectorStream(selector)(root.body);
}
