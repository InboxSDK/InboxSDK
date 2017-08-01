/* @flow */

import asap from 'asap';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {Stopper} from 'kefir-stopper';

export type ItemWithLifetime<T> = {el: T, removalStream: Kefir.Observable<null>};
export type ElementWithLifetime = ItemWithLifetime<HTMLElement>;

// Emits events whenever the given element has any children added or removed.
// Also when first listened to, it emits events for existing children.
export default function makeElementChildStream(element: HTMLElement): Kefir.Observable<ElementWithLifetime> {
  if (!element || !element.nodeType) {
    throw new Error("Expected element, got "+String(element));
  }

  return Kefir.stream((emitter) => {
    const removalStreams: Map<HTMLElement, Stopper> = new Map();
    let ended = false;

    function newEl(el: HTMLElement) {
      if (el.nodeType !== 1) return;

      if (removalStreams.has(el)) {
        throwLater(new Error("Already had removalStream for element with class "+el.className));
      }

      const removalStream = kefirStopper();
      removalStreams.set(el, removalStream);
      try {
        emitter.emit({el, removalStream});
      } catch (err) {
        throwLater(err);
      }
    }

    function removedEl(el: HTMLElement) {
      if (el.nodeType !== 1) return;
      const removalStream = removalStreams.get(el);
      removalStreams.delete(el);

      if (removalStream) {
        try {
          removalStream.destroy();
        } catch (err) {
          throwLater(err);
        }
      } else {
        throwLater(new Error("Could not find removalStream for element with class "+el.className));
      }
    }

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach((mutation) => {
        Array.prototype.forEach.call(mutation.addedNodes, newEl);
        Array.prototype.forEach.call(mutation.removedNodes, removedEl);
      });
    });

    // We don't want to emit the start children synchronously before all
    // stream listeners are subscribed.
    asap(() => {
      if (!ended) {
        observer.observe(element, {childList: true});
        // Clone child list first because it can change
        Array.prototype.slice.call(element.children).forEach(newEl);
      }
    });

    return function() {
      ended = true;
      observer.disconnect();
      asap(() => {
        removalStreams.forEach((removalStream, el) => {
          removalStream.destroy();
        });
      });
    };
  });
}

// Throw error at a later time where our error-logger can pick it up. This
// avoids having this module depend on logger.js which we can't import because
// this module is used in the injected script too.
function throwLater(err) {
  setTimeout(() => {
    throw err;
  }, 1);
}
