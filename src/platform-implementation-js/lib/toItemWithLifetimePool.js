/* @flow */

import type LiveSet from 'live-set';
import type {TagTreeNode} from 'tag-tree';
import toValueObservable from 'live-set/toValueObservable'
import Kefir from 'kefir';
import type {ElementWithLifetime} from './dom/make-element-child-stream';
import ItemWithLifetimePool from './ItemWithLifetimePool';

// Temporary module until we fully transition over to LiveSets
export default function toElementWithLifetimePool<T>(liveSet: LiveSet<TagTreeNode<HTMLElement>>): ItemWithLifetimePool<ElementWithLifetime> {
  return new ItemWithLifetimePool(
    Kefir.fromESObservable(toValueObservable(liveSet).map(event => {
      const value: TagTreeNode<HTMLElement> = event.value;
      const removal: Promise<void> = event.removal;
      const removalStream = Kefir.fromPromise(removal);
      return {el: event.value.getValue(), removalStream};
    }))
  );
}
