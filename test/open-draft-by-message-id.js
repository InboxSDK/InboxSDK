import assert from 'assert';
import openDraftByMessageID, {makeNewHash}
  from '../src/platform-implementation-js/dom-driver/gmail/gmail-driver/open-draft-by-message-id';

describe('openDraftByMessageID', function() {
  describe('makeNewHash', function() {
    it('0', function() {
      assert.strictEqual(makeNewHash('', '123'), '#?compose=123');
    });
    it('1', function() {
      assert.strictEqual(makeNewHash('#', '123'), '#?compose=123');
    });
    it('2', function() {
      assert.strictEqual(makeNewHash('#inbox', '123'), '#inbox?compose=123');
    });
    it('3', function() {
      assert.strictEqual(makeNewHash('#inbox?compose=123', '456'), '#inbox?compose=123%2C456');
    });
    it('5', function() {
      assert.strictEqual(makeNewHash('#inbox?foo=5', '123'), '#inbox?foo=5&compose=123');
    });
  });
});
