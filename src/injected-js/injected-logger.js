/* @flow */

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

  const errorProperties: Object = {};
  for (let name in err) {
    if (Object.prototype.hasOwnProperty.call(err, name)) {
      try {
        const value = (err:any)[name];
        JSON.stringify(value);
        errorProperties[name] = value;
      } catch (err) {
        // ignore
      }
    }
  }
  if (Object.keys(errorProperties).length > 0) {
    details = {errorProperties, details};
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
