export default function setupErrorSilencer() {
  var oldErrorHandlers: OnErrorEventHandler[] = [];
  document.addEventListener('inboxSDKsilencePageErrors', function () {
    oldErrorHandlers.push(window.onerror);

    window.onerror = function (...args) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('(Silenced in production) Page error:', ...args);
      }

      return true;
    };
  });
  document.addEventListener('inboxSDKunsilencePageErrors', function () {
    window.onerror = oldErrorHandlers.pop()!;
  });
}
