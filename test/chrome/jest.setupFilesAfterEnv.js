/* @flow */

// TODO this should be unnecessary, but https://github.com/smooth-code/jest-puppeteer/issues/106
jest.setTimeout(4 * 24 * 60 * 60 * 1000);

// Gmail emits nonsense page errors from time to time.
// jest-puppeteer catches these and re-emits as uncaughtException in the node process, which
// we don't want.
page.removeAllListeners('pageerror');

if (process.env.DISABLE_FAIL_PAUSE !== 'true' && process.env.CI !== 'true') {
  for (const methodName of [
    'afterAll',
    'afterEach',
    'beforeAll',
    'beforeEach'
  ]) {
    const originalMethod = global[methodName];

    global[methodName] = function(fn, timeout) {
      const newFn = async function() {
        try {
          return await fn.apply(this, arguments);
        } catch (err) {
          console.error(
            'Pausing on error. Disable this by setting env variable DISABLE_FAIL_PAUSE=true.'
          );
          console.log(err);
          await jestPuppeteer.debug();
          throw err;
        }
      };
      Object.defineProperty(newFn, 'name', { value: fn.name });
      return originalMethod.call(this, newFn, timeout);
    };
    Object.defineProperty(global[methodName], 'name', { value: methodName });
  }

  for (const methodName of ['it', 'fit']) {
    const originalMethod = global[methodName];

    global[methodName] = function(testName, fn, timeout) {
      const newFn = async function() {
        try {
          return await fn.apply(this, arguments);
        } catch (err) {
          console.error(
            'Pausing on error. Disable this by setting env variable DISABLE_FAIL_PAUSE=true.'
          );
          console.log(err);
          await jestPuppeteer.debug();
          throw err;
        }
      };
      Object.defineProperty(newFn, 'name', { value: fn.name });
      return originalMethod.call(this, testName, newFn, timeout);
    };
    Object.defineProperty(global[methodName], 'name', { value: methodName });
  }

  global.it.only = global.fit;
  global.test = global.it;
}
