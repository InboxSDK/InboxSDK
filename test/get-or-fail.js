/* @flow */

import assert from 'assert';
import get from "../src/common/get-or-fail";

describe("get-or-fail", function() {
  for (let value of ["string", {}, true, false, null, "''"]) {
    it(`works with ${JSON.stringify(value)}`, function() {
      const m = new Map();
      m.set('foo', value);
      assert.strictEqual(get(m, 'foo'), value);
    });
  }

  it("fails", function() {
    const m = new Map();
    assert.throws(() => {
      get(m, 'foo');
    });
  });
});
