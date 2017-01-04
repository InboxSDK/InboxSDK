/* @flow */

import type Kefir from 'kefir';

export type MoleViewDriver = {
  show(): void;
  setTitle(title: string): void;
  setMinimized(minimized: boolean): void;
  getMinimized(): boolean;
  getEventStream(): Kefir.Observable<Object>;
  destroy(): void;
};
