export class WaitForError extends Error {
  name = 'WaitForError';
  constructor() {
    super('waitFor timeout');
  }
}

/**
 * @param condition a function that returns the value to wait for, or falsey if it's not ready yet
 * @throws {WaitForError} if the condition is not met within the timeout
 */
export default function waitFor<T>(
  condition: () => T | null | undefined,
  timeout: number = 120 * 1000,
  steptime: number = 250,
): Promise<NonNullable<T>> {
  // make this error here so we have a sensible stack.
  const timeoutError = new WaitForError();

  return new Promise(function (resolve, reject) {
    let waited = 0;
    function step() {
      try {
        const result = condition();
        if (result) {
          resolve(result);
        } else {
          if (waited >= timeout) {
            reject(timeoutError);
          } else {
            waited += steptime;
            setTimeout(step, steptime);
          }
        }
      } catch (e) {
        reject(e);
      }
    }
    setTimeout(step, 1);
  });
}
