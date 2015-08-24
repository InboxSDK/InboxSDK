/* @flow */
// jshint ignore:start

export function error(err: Error, details?: any) {
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

export function eventSdkPassive(name: string, details?: any) {
  try {
    JSON.stringify(details);
  } catch (e) {
    details = "<failed to jsonify>";
  }

  document.dispatchEvent(new CustomEvent('inboxSDKinjectedEventSdkPassive', {
    bubbles: false,
    cancelable: false,
    detail: {name, details}
  }));
}
