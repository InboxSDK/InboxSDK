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
