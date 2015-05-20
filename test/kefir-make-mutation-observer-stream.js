import assert from 'assert';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import {EventEmitter} from 'events';
import Marker from '../src/common/marker';
import MockElementParent from './lib/mock-element-parent';

import kefirMakeMutationObserverStream from '../src/platform-implementation-js/lib/dom/kefir-make-mutation-observer-stream';

describe('kefirMakeMutationObserverStream', function() {
  global.MutationObserver = null;
  before(function() {
    global.MutationObserver = require('./lib/mock-mutation-observer');
  });
  after(function() {
    delete global.MutationObserver;
  });

  it('works with MockElementParent', function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');

    const target = new MockElementParent([child1, child2]);

    let call = 0;
    kefirMakeMutationObserverStream(target, {childList:true}).onValue(function(event) {
      switch(++call) {
        case 1:
          assert.deepEqual(event.addedNodes, []);
          assert.deepEqual(event.removedNodes, [child1]);
          target.appendChildren([child1, child3]);
          break;
        case 2:
          assert.deepEqual(event.addedNodes, [child1, child3]);
          assert.deepEqual(event.removedNodes, []);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });

    target.removeChild(child1);
  });

  it("doesn't emit events while current events are processed", function(done) {
    // See https://github.com/baconjs/bacon.js/issues/574
    const child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');

    const target = new MockElementParent([child1, child2]);
    const someBus = kefirBus();
    someBus.onValue(()=>{});

    let call = 0;
    let criticalSection = false;
    kefirMakeMutationObserverStream(target, {childList:true}).onValue(function(event) {
      if (criticalSection) {
        throw new Error("Re-entrance detected!");
      }
      criticalSection = true;
      switch(++call) {
        case 1:
          assert.deepEqual(event.addedNodes, []);
          assert.deepEqual(event.removedNodes, [child1]);
          someBus.end();
          break;
        case 2:
          assert.deepEqual(event.addedNodes, []);
          assert.deepEqual(event.removedNodes, [child2]);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
      criticalSection = false;
    });

    target.removeChild(child1);
    target.removeChild(child2);
  });

});
