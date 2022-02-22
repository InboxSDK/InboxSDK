import type LiveSet from 'live-set';
import * as Kefir from 'kefir';
import type { ItemWithLifetime } from './dom/make-element-child-stream';

export default function toItemWithLifetimeStream<T>(
  liveSet: LiveSet<T>
): Kefir.Observable<ItemWithLifetime<T>, never>;
