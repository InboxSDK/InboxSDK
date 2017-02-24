/* @flow */

import type LiveSet from 'live-set';
import type {TagTreeNode} from 'tag-tree';
import toValueObservable from 'live-set/toValueObservable'
import Kefir from 'kefir';
import type {ElementWithLifetime} from './dom/make-element-child-stream';
import ItemWithLifetimePool from './ItemWithLifetimePool';

import toItemWithLifetimeStream from './toItemWithLifetimeStream';

// Temporary module until we fully transition over to LiveSets
export default function toElementWithLifetimePool<T>(liveSet: LiveSet<TagTreeNode<HTMLElement>>): ItemWithLifetimePool<ElementWithLifetime> {
  return new ItemWithLifetimePool(toItemWithLifetimeStream(liveSet).map(({el, removalStream}) => {
    return {
      el: el.getValue(),
      removalStream
    };
  }));
}
