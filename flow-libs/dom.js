/* @flow */
// jshint ignore:start

declare class HTMLIFrameElement extends HTMLElement {
  src: string;
  contentWindow: {
    postMessage(message: any, origin: string, transfer?: boolean): void;
  };
}
