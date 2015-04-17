import assert from 'assert';
import RSVP from './lib/rsvp';
import {EventEmitter} from 'events';
import Marker from '../src/common/marker';

// jshint -W079
import MutationObserver from './lib/mock-mutation-observer';

describe('MockMutationObserver', function() {
  it('should work', function() {
    return new RSVP.Promise(function(resolve, reject) {
      const c1 = Marker('c1'), c2 = Marker('c2'), c3 = Marker('c3');

      const obs = new MutationObserver(function(mutations) {
        assert.strictEqual(mutations.length, 2);
        assert.deepEqual(mutations[0].addedNodes, [c1,c2]);
        assert.deepEqual(mutations[0].removedNodes, [c3]);
        assert.deepEqual(mutations[1].addedNodes, [c3]);
        assert.deepEqual(mutations[1].removedNodes, [c1,c2]);
        resolve();
      });

      const el = new EventEmitter();
      el._emitsMutations = true;
      obs.observe(el, {childList:true});

      el.emit('mutation', {addedNodes:[c1,c2], removedNodes:[c3]});
      el.emit('mutation', {addedNodes:[c3], removedNodes:[c1,c2]});
    });
  });

  it('can disconnect', function() {
    return new RSVP.Promise(function(resolve, reject) {
      const c1 = Marker('c1'), c2 = Marker('c2'), c3 = Marker('c3');

      const obs = new MutationObserver(function(mutations) {
        assert.strictEqual(mutations.length, 1);
        assert.deepEqual(mutations[0].addedNodes, [c1]);
        assert.deepEqual(mutations[0].removedNodes, []);
        resolve();
      });

      const elBad = new EventEmitter();
      elBad._emitsMutations = true;
      obs.observe(elBad, {childList:true});
      elBad.emit('mutation', {addedNodes:[c2], removedNodes:[c3]});

      obs.disconnect();
      elBad.emit('mutation', {addedNodes:[c2], removedNodes:[c3]});

      const elGood = new EventEmitter();
      elGood._emitsMutations = true;
      obs.observe(elGood, {childList:true});
      elGood.emit('mutation', {addedNodes:[c1], removedNodes:[]});
    });
  });
});
