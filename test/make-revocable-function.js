import assert from 'assert';

import makeRevocableFunction from '../src/platform-implementation-js/lib/make-revocable-function';

describe('makeRevocableFunction', function() {
  it('works', function() {
    var adder = {
      value: 0,
      add(x, y=0) {
        this.value += x + y;
        return this.value;
      }
    };

    const {fn, revoke} = makeRevocableFunction(adder.add);
    adder.add = fn;

    assert.strictEqual(adder.add(5), 5);
    assert.strictEqual(adder.add(2, 1), 8);
    assert.strictEqual(adder.add(3), 11);
    assert.strictEqual(adder.value, 11);

    revoke();

    assert.strictEqual(adder.add(3), undefined);
    assert.strictEqual(adder.value, 11);

    revoke(); // should be no-op

    assert.strictEqual(adder.add(3), undefined);
    assert.strictEqual(adder.value, 11);
  });

  it('revokedFn parameter works', function() {
    var adder = {
      value: 0,
      add(x, y=0) {
        this.value += x + y;
        return this.value;
      },
      subtract(x, y=0) {
        this.value -= x + y;
        return this.value;
      }
    };

    const {fn, revoke} = makeRevocableFunction(adder.add, adder.subtract);
    adder.add = fn;

    assert.strictEqual(adder.add(5), 5);
    assert.strictEqual(adder.add(2, 1), 8);
    assert.strictEqual(adder.add(3), 11);
    assert.strictEqual(adder.value, 11);

    revoke();

    assert.strictEqual(adder.add(3), 8);
    assert.strictEqual(adder.value, 8);

    revoke(); // should be no-op

    assert.strictEqual(adder.add(3), 5);
    assert.strictEqual(adder.value, 5);
  });
});
