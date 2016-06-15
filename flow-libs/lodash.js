// jshint ignore:start

declare module "lodash/function/once" {
  declare function exports<T>(cb: () => T): () => T;
}
