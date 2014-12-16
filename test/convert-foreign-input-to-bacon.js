var _ = require('lodash');
var assert = require('assert');
var Bacon = require('baconjs');

var convertForeignInputToBacon = require('../src/platform-implementation-js/lib/convert-foreign-input-to-bacon');

function testStreamForOneValue(stream, value, callback) {
  var s = convertForeignInputToBacon(stream);
  var values = 0;
  s.onValue(function(x) {
    assert.strictEqual(x, value);
    values++;
  });
  s.onEnd(function() {
    assert.strictEqual(values, 1);
    callback();
  });
}

function shouldNotBeCalled() {
  throw new Error("Should not be called");
}

describe('convertForeignInputToBacon', function() {
  it('can proxy Bacon.once', function(done) {
    testStreamForOneValue(Bacon.later(0, 'beep'), 'beep', done);
  });

  it('handles unsubscription', function(done) {
    var calls = 0;
    var s = convertForeignInputToBacon(Bacon.fromPoll(0, function() {
      if (++calls === 1) {
        return 'beep';
      } else {
        throw new Error("Should not happen");
      }
    }));
    s.take(1).onEnd(done);
  });

  it('transforms non-streams to single-item streams', function(done) {
    var value = {a: 5};
    testStreamForOneValue(value, value, done);
  });

  it('supports all event types', function(done) {
    var s = convertForeignInputToBacon(Bacon.mergeAll(
      Bacon.once('beep'),
      Bacon.once(new Bacon.Error('bad')),
      Bacon.once(shouldNotBeCalled)
    ).toProperty('prop'));

    var calls = 0;
    s.subscribe(function(event) {
      switch(++calls) {
        case 1:
          assert(event instanceof Bacon.Initial);
          assert.strictEqual(event.value(), 'prop');
          break;
        case 2:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 'beep');
          break;
        case 3:
          assert(event instanceof Bacon.Error);
          assert.strictEqual(event.error, 'bad');
          break;
        case 4:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), shouldNotBeCalled);
          break;
        case 5:
          assert(event instanceof Bacon.End);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });
  });

  it('works on non-Bacon object with subscribe method', function(done) {
    var unsubbed = 0;
    var s = convertForeignInputToBacon({
      subscribe: function(sink) {
        sink({
          isInitial: _.constant(true), isNext: _.constant(false),
          isError: _.constant(false), isEnd: _.constant(false),
          value: _.constant('prop')
        });
        sink({
          isInitial: _.constant(false), isNext: _.constant(true),
          isError: _.constant(false), isEnd: _.constant(false),
          value: _.constant('beep')
        });
        setTimeout(function() {
          sink({
            isInitial: _.constant(false), isNext: _.constant(false),
            isError: _.constant(true), isEnd: _.constant(false),
            error: 'bad'
          });
          sink({
            isInitial: _.constant(false), isNext: _.constant(true),
            isError: _.constant(false), isEnd: _.constant(false),
            value: _.constant(shouldNotBeCalled)
          });
          sink({
            isInitial: _.constant(false), isNext: _.constant(false),
            isError: _.constant(false), isEnd: _.constant(true)
          });
          sink({
            isInitial: _.constant(false), isNext: _.constant(true),
            isError: _.constant(false), isEnd: _.constant(false),
            value: function() {
              throw new Error("Post-end event should not be evaluated");
            }
          });
        }, 0);

        return function() {
          unsubbed++;
        };
      }
    });

    var calls = 0;
    s.subscribe(function(event) {
      switch(++calls) {
        case 1:
          assert(event instanceof Bacon.Initial);
          assert.strictEqual(event.value(), 'prop');
          break;
        case 2:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), 'beep');
          break;
        case 3:
          assert(event instanceof Bacon.Error);
          assert.strictEqual(event.error, 'bad');
          break;
        case 4:
          assert(event instanceof Bacon.Next);
          assert.strictEqual(event.value(), shouldNotBeCalled);
          break;
        case 5:
          assert(event instanceof Bacon.End);
          assert.strictEqual(unsubbed, 1);
          done();
          break;
        default:
          throw new Error("Should not happen");
      }
    });
  });
});
