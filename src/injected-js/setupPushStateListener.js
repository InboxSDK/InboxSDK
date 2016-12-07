/* @flow */

export default function setupPushStateListener() {
  const origPushState = history.pushState;
  (history:any).pushState = function(...args) {
    const ret = origPushState.apply(this, args);
    document.dispatchEvent(new CustomEvent('inboxSDKpushState', {
      bubbles: false, cancelable: false,
      detail: {args}
    }));
    return ret;
  };
}
