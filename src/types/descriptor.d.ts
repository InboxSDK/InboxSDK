import { Observable } from 'kefir';

/**
 * @type {T} The descriptor as either an object or Observable<object>.
 * @typedef {U} @optional The type of errors emitted. We use either `unknown` or `any` in most cases.
 *
 * We generally run passed descriptors through `kefir-cast` and flatten them
 * to Observable<T, U>.
 */
export type Descriptor<T, U = unknown> = T | Observable<T, U>;
