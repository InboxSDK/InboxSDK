/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import sinon from 'sinon';
const sinonTest = require('sinon-test')(sinon, {useFakeTimers: false});

import makeElementStreamMerger from './make-element-stream-merger';

function fakeEl(name: string): Object {
  return {name, nodeType: 1};
}

it('passes through unrelated events', done => {
  const e1 = {
    el: fakeEl('e1.el'),
    removalStream: kefirBus()
  };
  const e2 = {
    el: fakeEl('e2.el'),
    removalStream: kefirBus()
  };
  let i = 0;
  Kefir.sequentially(0, [e1, e2]).flatMap(makeElementStreamMerger()).onValue(event => {
    switch (++i) {
      case 1:
        expect(event.el).toBe(e1.el);
        event.removalStream.onValue(() => {
          expect(i).toBe(2);
          done();
        });
        break;
      case 2:
        expect(event.el).toBe(e2.el);
        event.removalStream.onValue(() => {
          throw new Error("Should not be removed");
        });
        e1.removalStream.emit(null);
        e1.removalStream.end();
        break;
      default:
        throw new Error("Should not happen");
    }
  });
});

it('can persist elements', done => {
  // All but e2 and e5 are element events concerning the same element "e1.el".
  // The element will be removed and re-added instantly several times (which
  // means those element events should be merged) and then the element will
  // be removed and re-added a moment later (e6), which shouldn't get merged
  // and should get its own event.
  const e1 = {
    el: fakeEl('e1.el'),
    removalStream: kefirBus()
  };
  const e2 = {
    el: fakeEl('e2.el'),
    removalStream: kefirBus()
  };
  const e3 = {
    el: e1.el,
    removalStream: kefirBus()
  };
  const e4 = {
    el: e1.el,
    removalStream: kefirBus()
  };
  const e5 = {
    el: fakeEl('e5.el'),
    removalStream: kefirBus()
  };
  const e6 = {
    el: e1.el,
    removalStream: kefirBus()
  };
  const bus = kefirBus();
  let i = 0, elWasRemoved = false;
  bus.flatMap(makeElementStreamMerger()).onValue(event => {
    switch(++i) {
      case 1:
        expect(event.el).toBe(e1.el);
        event.removalStream.onValue(() => {
          expect(i).toBe(3); // check that e1.el is removed after e5 is received
          elWasRemoved = true;
        });
        break;
      case 2:
        expect(event.el).toBe(e2.el);
        setTimeout(() => {
          e3.removalStream.emit(null);
          e3.removalStream.end();
          bus.emit(e4);
          bus.emit(e5);
        }, 0);
        break;
      case 3:
        expect(event.el).toBe(e5.el);

        // This should finally trigger the first event's removal stream in
        // case 1.
        e4.removalStream.emit(null);
        e4.removalStream.end();

        setTimeout(() => {
          bus.emit(e6);
        }, 0);
        break;
      case 4:
        expect(elWasRemoved).toBe(true);
        expect(event.el).toBe(e1.el);
        done();
        break;
      default:
        throw new Error("Should not happen");
    }
  });
  bus.emit(e1);
  setTimeout(() => {
    e1.removalStream.emit(null);
    e1.removalStream.end();
    bus.emit(e2);
    bus.emit(e3);
  }, 0);
});

it('warns if element stays in multiple streams', sinonTest(async function() {
  this.stub(console, "warn");
  const e1 = {
    el: fakeEl('e1.el'),
    removalStream: kefirBus()
  };
  const e2 = {
    el: e1.el,
    removalStream: kefirBus()
  };
  const e3 = {
    el: e1.el,
    removalStream: kefirBus()
  };
  const e4 = {
    el: fakeEl('e4.el'),
    removalStream: kefirBus()
  };
  let i = 0;

  await new Promise(resolve => {
    Kefir.sequentially(0, [e1, e2, e3, e4])
      .flatMap(makeElementStreamMerger())
      .onValue(event => {
        switch(++i) {
          case 1:
            break;
          case 2:
            expect(console.warn.callCount).toBeGreaterThan(0); // eslint-disable-line no-console
            resolve();
            break;
          default:
            throw new Error("Should not happen");
        }
      });
  });
}));
