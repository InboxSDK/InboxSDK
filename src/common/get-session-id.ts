export default function getSessionId(): string {
  const attrValue =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-inboxsdk-session-id');
  if (typeof attrValue === 'string') {
    return attrValue;
  } else {
    const sessionId = Date.now() + '-' + Math.random();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-inboxsdk-session-id',
        sessionId,
      );
    }
    return sessionId;
  }
}
