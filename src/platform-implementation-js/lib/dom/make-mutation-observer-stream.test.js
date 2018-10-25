/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import EventEmitter from 'events';
import MockElementParent from '../../../../test/lib/mock-element-parent';
import MockMutationObserver from '../../../../test/lib/mock-mutation-observer';

import makeMutationObserverStream from './make-mutation-observer-stream';

global.MutationObserver = MockMutationObserver;

function fakeEl(name: string): Object {
  return {name, nodeType: 1};
}

it('works with MockElementParent', done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2'), child3 = fakeEl('child3');

  const target = new MockElementParent([child1, child2]);

  let call = 0;
  makeMutationObserverStream((target:Object), {childList:true}).onValue(event => {
    switch(++call) {
      case 1:
        expect(event.addedNodes).toEqual([]);
        expect(event.removedNodes).toEqual([child1]);
        target.appendChildren([child1, child3]);
        break;
      case 2:
        expect(event.addedNodes).toEqual([child1, child3]);
        expect(event.removedNodes).toEqual([]);
        done();
        break;
      default:
        throw new Error("should not happen");
    }
  });

  target.removeChild(child1);
});

it("doesn't emit events while current events are processed", done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2'), child3 = fakeEl('child3');

  const target = new MockElementParent([child1, child2]);
  const someBus = kefirBus();
  someBus.onValue(()=>{});

  let call = 0;
  let criticalSection = false;
  makeMutationObserverStream((target:Object), {childList:true}).onValue(event => {
    if (criticalSection) {
      throw new Error("Re-entrance detected!");
    }
    criticalSection = true;
    switch(++call) {
      case 1:
        expect(event.addedNodes).toEqual([]);
        expect(event.removedNodes).toEqual([child1]);
        someBus.end();
        break;
      case 2:
        expect(event.addedNodes).toEqual([]);
        expect(event.removedNodes).toEqual([child2]);
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
