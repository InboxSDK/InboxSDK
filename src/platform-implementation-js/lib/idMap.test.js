/* @flow */

import {getId, _reset} from './idMap';

afterEach(_reset);

for (let env of ['test', 'development']) {
  describe(`NODE_ENV: ${env}`, () => {
    let original_NODE_ENV;
    beforeAll(() => {
      original_NODE_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = env;
    });
    afterAll(() => {
      process.env.NODE_ENV = original_NODE_ENV;
    });

    describe('common', () => {
      test('getId works', () => {
        const a = getId('aleph');
        const b = getId('bet');
        expect(a).not.toBe(b);
        expect(typeof a).toBe('string');
        expect(typeof b).toBe('string');

        expect(getId('aleph')).toBe(a);
        expect(getId('bet')).toBe(b);
        expect(getId('aleph')).toBe(a);
      });

      test('ids are unique', () => {
        const ids = new Set();
        for (let i=0; i<20; i++) {
          const id = getId(`foo${i}`);
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      });
    });

    describe('env-specific', () => {
      if (env === 'development') {
        test('ids are equal to the name', () => {
          for (let i=0; i<10; i++) {
            const id = getId(`foo${i}`);
            expect(id).toBe(`foo${i}`);
          }
        });
      } else {
        test('ids do not contain digits and are at least 6 characters', () => {
          for (let i=0; i<10; i++) {
            const id = getId(`foo${i}`);
            expect(/[0-9]/.test(id)).toBe(false);
            expect(id.length).toBeGreaterThanOrEqual(6);
          }
        });

        test('ids depend on seed', () => {
          const a1 = getId('foo');
          const a2 = getId('foo');
          expect(a2).toBe(a1);

          document.documentElement.removeAttribute('data-map-id');
          _reset();

          const b1 = getId('foo');
          const b2 = getId('foo');
          expect(b2).toBe(b1);

          expect(b1).not.toBe(a1);
        });
      }
    });
  });
}
