/* @flow */

import idMap, {_reset} from './idMap';

const original_Date_now = Date.now;
afterEach(() => {
  _reset();
  (Date:any).now = original_Date_now;
});

for (let env of ['test', 'development']) {
  describe(`NODE_ENV: ${env}`, () => {
    let original_NODE_ENV;
    beforeAll(() => {
      original_NODE_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = env;
    });
    afterAll(() => {
      process.env.NODE_ENV = original_NODE_ENV;
      document.documentElement.removeAttribute('data-map-id');
    });

    describe('common', () => {
      test('idMap works', () => {
        const a = idMap('aleph');
        const b = idMap('bet');
        expect(a).not.toBe(b);
        expect(typeof a).toBe('string');
        expect(typeof b).toBe('string');

        expect(idMap('aleph')).toBe(a);
        expect(idMap('bet')).toBe(b);
        expect(idMap('aleph')).toBe(a);
      });

      test('ids are unique', () => {
        const ids = new Set();
        for (let i=0; i<20; i++) {
          const id = idMap(`foo${i}`);
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      });
    });

    describe('env-specific', () => {
      if (env === 'development') {
        test('ids are similar to the name', () => {
          for (let i=0; i<10; i++) {
            const id = idMap(`foo${i}`);
            expect(id).toMatch(new RegExp(`^idm\\d_foo${i}$`));
          }
        });
      } else {
        test('ids are only alphabetic and are at least 6 characters', () => {
          for (let i=0; i<10; i++) {
            const id = idMap(`foo${i}`);
            expect(/^[a-zA-Z]+$/.test(id)).toBe(true);
            expect(id.length).toBeGreaterThanOrEqual(6);
          }
        });

        test('ids depend on seed', () => {
          const a1 = idMap('foo');
          const a2 = idMap('foo');
          expect(a2).toBe(a1);

          (Date:any).now = () => original_Date_now() + 1000*60*60;
          document.documentElement.removeAttribute('data-map-id');
          _reset();

          const b1 = idMap('foo');
          const b2 = idMap('foo');
          expect(b2).toBe(b1);

          expect(b1).not.toBe(a1);
        });
      }
    });
  });
}
