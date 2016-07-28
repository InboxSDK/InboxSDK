declare module "lodash/once" {
  declare function exports<T>(cb: () => T): () => T;
}
