/* @flow */
// jshint ignore:start

export default function setupErrorSilencer() {
  var oldErrorHandlers = [];

  document.addEventListener('inboxSDKsilencePageErrors', function(event) {
    oldErrorHandlers.push(window.onerror);
    window.onerror = function(...args) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("(Silenced in production) Page error:", ...args);
      }
      return true;
    };
  });

  document.addEventListener('inboxSDKunsilencePageErrors', function(event) {
    window.onerror = oldErrorHandlers.pop();
  });
}
