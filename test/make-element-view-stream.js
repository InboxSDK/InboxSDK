/* @flow */

import assert from 'assert';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
const {EventEmitter} = require('events');
import Marker from '../src/common/marker';
import MockElementParent from './lib/mock-element-parent';
import fakePageGlobals from './lib/fake-page-globals';

import makeElementViewStream from '../src/platform-implementation-js/lib/dom/make-element-view-stream';
import makeElementChildStream from '../src/platform-implementation-js/lib/dom/make-element-child-stream';

describe('makeElementViewStream', function() {
  fakePageGlobals();

  it('should work with makeElementChildStream', function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');

    const stopper = kefirBus();
    let activeViewCount = 0;

    const target = new MockElementParent([child1, child2]);

    let call = 0;
    makeElementChildStream((target:Object))
      .takeUntilBy(stopper)
      .flatMap(makeElementViewStream(function(el) {
        activeViewCount++;
        return {
          el: el,
          destroy: function() {
            activeViewCount--;
            if (el === child2) {
              target.appendChild(child3);
            } else if (activeViewCount === 0) {
              done();
            }
          }
        };
      })).onValue(function(view) {
        switch(++call) {
          case 1:
            assert.strictEqual(view.el, child1);
            break;
          case 2:
            assert.strictEqual(view.el, child2);
            break;
          case 3:
            assert.strictEqual(view.el, child3);
            stopper.emit('beep');
            break;
          default:
            throw new Error("should not happen");
        }
      });

    setTimeout(function() {
      target.removeChild(child2);
    }, 0);
  });
});
