/* @flow */

export default function getSessionId(): string {
  const attrValue = global.document && ((document.documentElement:any):HTMLElement).getAttribute('data-inboxsdk-session-id');
  if (typeof attrValue === 'string') {
    return attrValue;
  } else {
    const sessionId = Date.now()+'-'+Math.random();
    if (global.document) {
      ((document.documentElement:any):HTMLElement).setAttribute('data-inboxsdk-session-id', sessionId);
    }
    return sessionId;
  }
}
