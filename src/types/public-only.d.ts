/**
 * TS unhelpfully includes #private in the type of a class which includes private members,
 * even though it's not accessible from outside the class at runtime.
 *
 * This prevents using `implements` with the class, which is used in a number of SDK classes.
 *
 * https://stackoverflow.com/a/60390007/1924257
 */
export type PublicOnly<T> = Pick<T, keyof T>;
