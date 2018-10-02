declare module "lodash/once" {
  declare module.exports: <T>(cb: () => T) => () => T;
}

declare module "lodash/constant" {
  declare module.exports: <T>(value: T) => () => T;
}

declare module "lodash/memoize" {
  declare module.exports: <T: (...args: any[]) => any>(cb: T, keyFn?: Function) => T;
}
