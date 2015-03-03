import assert from 'assert';
import co from 'co';
import sinon from 'sinon';
import delay from '../src/common/delay';
import MockStorage from './lib/mock-storage';

import CachingMap from '../src/platform-implementation-js/lib/caching-map';

describe("CachingMap", function() {
  it("works", co.wrap(function*() {
    const storage = new MockStorage();
    const cm = new CachingMap('foo', {storage, flushTime: 1});
    assert.strictEqual(cm.has('a'), false);
    assert.strictEqual(cm.get('a'), undefined);

    cm.set('a', {b:'c'});
    assert.deepEqual(cm.get('a'), {b:'c'});
    assert.strictEqual(storage.length, 0);
    assert.strictEqual(storage.getItem('foo'), null);
    yield delay(1);

    assert.strictEqual(storage.length, 1);
    assert.deepEqual(JSON.parse(storage.getItem('foo')), [['a', {b:'c'}]]);

    cm.delete('a');
    assert.strictEqual(cm.has('a'), false);
    assert.strictEqual(cm.get('a'), undefined);
    assert.strictEqual(storage.length, 1);
    assert.deepEqual(JSON.parse(storage.getItem('foo')), [['a', {b:'c'}]]);

    yield delay(1);
    assert.strictEqual(storage.length, 1);
    assert.deepEqual(JSON.parse(storage.getItem('foo')), []);
  }));

  it("can be remade from storage", co.wrap(function*() {
    const storage = new MockStorage();
    const foo1 = new CachingMap('foo', {storage, flushTime: 1});
    foo1.set('a', {b:'c'});
    assert.deepEqual(foo1.get('a'), {b:'c'});
    yield delay(1);

    const foo2 = new CachingMap('foo', {storage, flushTime: 1});
    const bar1 = new CachingMap('bar', {storage, flushTime: 1});

    assert.deepEqual(foo2.get('a'), {b:'c'});
    assert.strictEqual(bar1.has('a'), false);
  }));

  it("doesn't fail even if storage is corrupt", sinon.test(function() {
    const storage = new MockStorage();
    storage.setItem('foo', JSON.stringify([null]));

    const consoleMock = this.mock(console);
    consoleMock.expects("error").once();
    const foo = new CachingMap('foo', {storage, flushTime: 1});
    assert.strictEqual(foo.size, 0);
    foo.set('a', 'b');
    assert.strictEqual(foo.size, 1);
  }));
});
