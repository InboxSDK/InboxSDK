/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import Logger from '../../../../lib/logger';
import streamWaitFor from '../../../../lib/stream-wait-for';
import censorHTMLtree from '../../../../../common/censor-html-tree';
import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';

export default function watcher(
  root: Document=document
): Kefir.Stream<ElementWithLifetime> {
  return Kefir.never();
}
