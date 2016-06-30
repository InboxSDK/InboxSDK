/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import delayAsap from './delay-asap';
import type {ItemWithLifetime} from './dom/make-element-child-stream';

// Class that must be given a stream of ItemWithLifetime objects. It then has a
// method that allows the stream to be re-subscribed to multiple times in the
// future, with all of the still-existing items emitted at the start.
export default class ItemWithLifetimePool<T> {
  _input: Kefir.Stream<ItemWithLifetime<T>>;
  _items: Set<ItemWithLifetime<T>> = new Set();

  constructor(input: Kefir.Stream<ItemWithLifetime<T>>) {
    this._input = input;
    this._input.onValue(item => {
      this._items.add(item);
      item.removalStream.take(1).onValue(() => {
        this._items.delete(item);
      });
    });
  }

  items(): Kefir.Stream<ItemWithLifetime<T>> {
    return delayAsap().flatMap(() => this._input.merge(
      Kefir.constant(Array.from(this._items)).flatten()
    ));
  }
}
