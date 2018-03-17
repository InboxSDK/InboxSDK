declare module "lodash/once" {
  declare function exports<T>(cb: () => T): () => T;
}

declare module "lodash/constant" {
  declare function exports<T>(value: T): () => T;
}

declare module "lodash/memoize" {
  declare function exports<T: (...args: any[]) => any>(cb: T, keyFn?: Function): T;
}
