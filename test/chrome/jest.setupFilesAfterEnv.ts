// TODO this should be unnecessary, but https://github.com/smooth-code/jest-puppeteer/issues/106
jest.setTimeout(4 * 24 * 60 * 60 * 1000);

// Gmail emits nonsense page errors from time to time.
// jest-puppeteer catches these and re-emits as uncaughtException in the node process, which
// we don't want.
page.removeAllListeners('pageerror');

// Given a function (like beforeEach or test) which takes arguments that include
// functions, make a new function which if any of its parameter functions throw an error,
// they call jestPuppeteer.debug() before failing.
function makeFunctionWrapTestArgs<F extends Function>(fn: F): F {
  const newFn: any = function (this: any, ...args: any[]) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'function') {
        args[i] = async function (this: any, ...args: any[]) {
          try {
            return await arg.apply(this, args);
          } catch (err) {
            console.error(
              'Pausing on error. Disable this by setting env variable DISABLE_FAIL_PAUSE=true.'
            );
            console.log(err);
            await jestPuppeteer.debug();
            throw err;
          }
        };
        Object.defineProperty(args[i], 'name', { value: arg.name });
      }
    }
    return fn.apply(this, args);
  };
  Object.defineProperty(newFn, 'name', { value: fn.name });
  Object.entries(fn).forEach(([methodName, method]) => {
    if (typeof method === 'function') {
      newFn[methodName] = makeFunctionWrapTestArgs(method);
    } else {
      newFn[methodName] = method;
    }
  });
  return newFn;
}

if (process.env.DISABLE_FAIL_PAUSE !== 'true' && process.env.CI !== 'true') {
  for (const methodName of [
    'afterAll',
    'afterEach',
    'beforeAll',
    'beforeEach',
    'it',
    'fit',
    'test',
  ]) {
    (global as any)[methodName] = makeFunctionWrapTestArgs(
      (global as any)[methodName]
    );
  }
}

export {};
