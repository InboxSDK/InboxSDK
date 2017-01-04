/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import Logger from '../../../../lib/logger';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import selectorStream from '../../../../lib/dom/selectorStream';

export default function watcher(
  root: Document=document
): Kefir.Observable<ElementWithLifetime> {
  const selector = selectorStream([
    'iframe[id][frameborder]:not([src])',
    {$map: el => (el:any).contentDocument.body},
    'div[aria-label][role=dialog]',
    {$watch: ':not([aria-hidden=true])'}
  ]);

  return selector(root.body);
}
