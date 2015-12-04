// jshint ignore:start

declare class HTMLIFrameElement extends HTMLElement {
  src: string;
  contentWindow: {
    postMessage(message: any, origin: string, transfer?: boolean): void;
  };
}

declare class CustomEvent extends Event {
  constructor(typeArg: string, customEventInit?: {
    bubbles?: boolean;
    cancelable?: boolean;
    detail?: any;
  }): void;
  detail: any;
}
