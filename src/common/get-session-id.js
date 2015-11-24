/* @flow */
//jshint ignore:start

export default function getSessionId(): string {
  if (global.document && document.documentElement.hasAttribute('data-inboxsdk-session-id')) {
    return document.documentElement.getAttribute('data-inboxsdk-session-id');
  } else {
    const sessionId = Date.now()+'-'+Math.random();
    if (global.document) {
      document.documentElement.setAttribute('data-inboxsdk-session-id', sessionId);
    }
    return sessionId;
  }
}
