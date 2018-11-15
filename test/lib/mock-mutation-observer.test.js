/* @flow */

import EventEmitter from 'events';

import MutationObserver from './mock-mutation-observer';

function fakeEl(name: string): Object {
  return {name, nodeType: 1};
}

it('should work', () => {
  return new Promise((resolve, reject) => {
    const c1 = fakeEl('c1'), c2 = fakeEl('c2'), c3 = fakeEl('c3');

    const obs = new MutationObserver(mutations => {
      expect(mutations.length).toBe(2);
      expect(mutations[0].addedNodes).toEqual([c1,c2]);
      expect(mutations[0].removedNodes).toEqual([c3]);
      expect(mutations[1].addedNodes).toEqual([c3]);
      expect(mutations[1].removedNodes).toEqual([c1,c2]);
      resolve();
    });

    const el: Object = new EventEmitter();
    el._emitsMutations = true;
    obs.observe(el, {childList:true});

    el.emit('mutation', {addedNodes:[c1,c2], removedNodes:[c3]});
    el.emit('mutation', {addedNodes:[c3], removedNodes:[c1,c2]});
  });
});

it('can disconnect', () => {
  return new Promise((resolve, reject) => {
    const c1 = fakeEl('c1'), c2 = fakeEl('c2'), c3 = fakeEl('c3');

    const obs = new MutationObserver(mutations => {
      expect(mutations.length).toBe(1);
      expect(mutations[0].addedNodes).toEqual([c1]);
      expect(mutations[0].removedNodes).toEqual([]);
      resolve();
    });

    const elBad: Object = new EventEmitter();
    elBad._emitsMutations = true;
    obs.observe(elBad, {childList:true});
    elBad.emit('mutation', {addedNodes:[c2], removedNodes:[c3]});

    obs.disconnect();
    elBad.emit('mutation', {addedNodes:[c2], removedNodes:[c3]});

    const elGood: Object = new EventEmitter();
    elGood._emitsMutations = true;
    obs.observe(elGood, {childList:true});
    elGood.emit('mutation', {addedNodes:[c1], removedNodes:[]});
  });
});
