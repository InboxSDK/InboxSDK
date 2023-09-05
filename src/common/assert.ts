export class AssertionError extends Error {
  name = 'AssertionError';
  constructor(message?: string) {
    super(message ?? 'assertion failed');
  }
}

export function assert(condition: unknown, message?: string) {
  // eslint-disable-next-line no-extra-boolean-cast -- this is to mimic Node's assert behavior
  if (!!condition) {
    // ok
  } else {
    throw new AssertionError(message);
  }
}
