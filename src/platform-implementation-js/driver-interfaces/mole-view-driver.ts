import type Kefir from 'kefir';
export type MoleViewDriver = {
  show(): void;
  setTitle(title: string): void;
  setMinimized(minimized: boolean): void;
  getMinimized(): boolean;
  getEventStream(): Kefir.Observable<Record<string, any>>;
  destroy(): void;
};
export type MoleButtonDescriptor = {
  title: string;
  iconUrl: string;
  iconClass?: string;
  onClick: (...args: Array<any>) => any;
};
export type MoleOptions = {
  el: HTMLElement;
  className?: string;
  title?: string;
  titleEl?: HTMLElement;
  minimizedTitleEl?: HTMLElement;
  titleButtons?: MoleButtonDescriptor[];
  chrome?: boolean;
};
