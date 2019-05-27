export default async function attemptWithRetries<T>(
  fn: () => Promise<T>,
  attemptCount: number,
  errorsToRetry: (error: Error) => boolean = () => true
): Promise<T> {
  if (attemptCount < 1) {
    throw new Error('Attempt count must be positive');
  }
  try {
    return await fn();
  } catch (err) {
    if (attemptCount > 1 && errorsToRetry(err)) {
      return attemptWithRetries(fn, attemptCount - 1, errorsToRetry);
    } else {
      throw err;
    }
  }
}
