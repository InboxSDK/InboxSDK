// Type predicate to avoid opting out of strict type checking in filter operations.
// Adapted from https://stackoverflow.com/a/46700791
export default function isNotNil<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return value != null;
}
