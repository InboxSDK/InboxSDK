/* @flow */

import type LiveSet from 'live-set';
import toValueObservable from 'live-set/toValueObservable';
import Kefir from 'kefir';
import type {ItemWithLifetime} from './dom/make-element-child-stream';

export default function toItemWithLifetimeStream<T>(liveSet: LiveSet<T>): Kefir.Observable<ItemWithLifetime<T>> {
  return Kefir.fromESObservable(toValueObservable(liveSet).map(event => {
    const removal: Promise<void> = event.removal;
    const removalStream = Kefir.fromPromise(removal);
    return {el: event.value, removalStream};
  }));
}
