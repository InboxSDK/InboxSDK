/* @flow */
// jshint ignore:start

export default function logError(err: Error, details?: any) {
  if (!err) {
    err = new Error("No error given");
  }
  console.error("Error in injected script", err, details);
  try {
    JSON.stringify(details);
  } catch (e) {
    details = "<failed to jsonify>";
  }

  document.dispatchEvent(new CustomEvent('inboxSDKinjectedError', {
    bubbles: false,
    cancelable: false,
    detail: {
      message: err && err.message,
      stack: err && err.stack,
      details
    }
  }));
}
