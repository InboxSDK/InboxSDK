/* @flow */

import openDraftByMessageID, { makeNewHash } from './open-draft-by-message-id';

describe('makeNewHash', () => {
  it('1', () => {
    expect(makeNewHash('', '123')).toBe('#?compose=123');
  });
  it('2', () => {
    expect(makeNewHash('#', '123')).toBe('#?compose=123');
  });
  it('3', () => {
    expect(makeNewHash('#inbox', '123')).toBe('#inbox?compose=123');
  });
  it('4', () => {
    expect(makeNewHash('#inbox?compose=123', '456')).toBe(
      '#inbox?compose=123%2C456'
    );
  });
  it('5', () => {
    expect(makeNewHash('#inbox?foo=5', '123')).toBe('#inbox?foo=5&compose=123');
  });
});
