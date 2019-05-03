/* @flow */

// TODO this should be unnecessary, but https://github.com/smooth-code/jest-puppeteer/issues/106
jest.setTimeout(4 * 24 * 60 * 60 * 1000);

if (process.env.DISABLE_FAIL_PAUSE !== 'true' && process.env.CI !== 'true') {
  const originalIt = global.jasmine.getEnv().it;

  global.jasmine.getEnv().it = function(name, fn, timeout) {
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
    return originalIt.call(this, name, newFn, timeout);
  };
}
