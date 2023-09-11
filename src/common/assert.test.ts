import { AssertionError, assert } from './assert';

describe(assert.name, () => {
  it('should throw an error if the condition is false', () => {
    expect(() => assert(false, 'test')).toThrow(AssertionError);
  });

  it('should not throw an error if the condition is true', () => {
    expect(() => assert(true, 'test')).not.toThrow(AssertionError);
  });

  it('should throw an error with the correct message', () => {
    try {
      assert(false, 'test');
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toEqual('test');
      }
    }
  });
});
