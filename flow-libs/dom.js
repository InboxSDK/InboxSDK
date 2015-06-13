// jshint ignore:start

declare class HTMLIFrameElement extends HTMLElement {
  src: string;
  contentWindow: {
    postMessage(message: any, origin: string, transfer?: boolean): void;
  };
}

declare class sdkMutationObserver {
    constructor(callback: (arr: Array<MutationRecord>, observer: sdkMutationObserver)=>any): void;
    observe(target: Node, options: {
        childList?: boolean;
        attributes?: boolean;
        characterData?: boolean;
        subtree?: boolean;
        attributeOldValue?: boolean;
        characterDataOldValue?: boolean;
        attributeFilter?: Array<string>;
    }): void;
    takeRecords(): Array<MutationRecord>;
    disconnect(): void;
}

declare class CustomEvent extends Event {
  constructor(typeArg: string, customEventInit?: {
    bubbles?: boolean;
    cancelable?: boolean;
    detail?: any;
  }): void;
  detail: any;
}
