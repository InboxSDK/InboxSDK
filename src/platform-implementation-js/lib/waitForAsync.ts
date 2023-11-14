import delay from 'pdelay';

export default async function waitForAsync<T>(
  condition: () => Promise<T | null | undefined>,
  timeout: number = 120 * 1000,
  steptime: number = 250,
): Promise<T> {
  // make this error here so we have a sensible stack.
  const timeoutError = new Error('waitForAsync timeout');
  const timeoutTime = Date.now() + timeout;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result: T | null | undefined = await condition();
    if (result) {
      return result;
    }
    await delay(steptime);
    if (Date.now() > timeoutTime) {
      throw timeoutError;
    }
  }

  throw new Error();
}
