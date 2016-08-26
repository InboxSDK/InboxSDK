declare module "lodash/once" {
  declare function exports<T>(cb: () => T): () => T;
}

declare module "lodash/constant" {
  declare function exports<T>(value: T): () => T;
}
