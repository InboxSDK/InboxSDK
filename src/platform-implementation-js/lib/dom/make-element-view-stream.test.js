/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
const {EventEmitter} = require('events');
import MockElementParent from '../../../../test/lib/mock-element-parent';
import MockMutationObserver from '../../../../test/lib/mock-mutation-observer';

import makeElementViewStream from './make-element-view-stream';
import makeElementChildStream from './make-element-child-stream';

global.MutationObserver = MockMutationObserver;

function fakeEl(name: string): Object {
  return {name, nodeType: 1};
}

it('should work with makeElementChildStream', done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2'), child3 = fakeEl('child3');

  const stopper = kefirBus();
  let activeViewCount = 0;

  const target = new MockElementParent([child1, child2]);

  let call = 0;
  makeElementChildStream((target:Object))
    .takeUntilBy(stopper)
    .flatMap(makeElementViewStream(el => {
      activeViewCount++;
      return {
        el: el,
        destroy: () => {
          activeViewCount--;
          if (el === child2) {
            target.appendChild(child3);
          } else if (activeViewCount === 0) {
            done();
          }
        }
      };
    })).onValue(view => {
      switch(++call) {
        case 1:
          expect(view.el).toBe(child1);
          break;
        case 2:
          expect(view.el).toBe(child2);
          break;
        case 3:
          expect(view.el).toBe(child3);
          stopper.emit('beep');
          break;
        default:
          throw new Error("should not happen");
      }
    });

  setTimeout(() => {
    target.removeChild(child2);
  }, 0);
});
