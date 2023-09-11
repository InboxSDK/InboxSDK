export function error(err: Error | unknown, details?: any) {
  if (!err) {
    err = new Error('No error given');
  }
  console.error('Error in injected script', err, details);
  try {
    JSON.stringify(details);
  } catch (e) {
    details = '<failed to jsonify>';
  }

  const errorProperties: any = {};
  for (const name in err as any) {
    if (Object.prototype.hasOwnProperty.call(err, name)) {
      try {
        const value = (err as any)[name];
        JSON.stringify(value);
        errorProperties[name] = value;
      } catch (err) {
        // ignore
      }
    }
  }
  if (Object.keys(errorProperties).length > 0) {
    details = { errorProperties, details };
  }

  document.dispatchEvent(
    new CustomEvent('inboxSDKinjectedError', {
      bubbles: false,
      cancelable: false,
      detail: {
        message: err && (err as any).message,
        stack: err && (err as any).stack,
        details,
      },
    }),
  );
}

export function eventSdkPassive(
  name: string,
  details?: any,
  sensitive?: boolean,
) {
  try {
    JSON.stringify(details);
  } catch (e) {
    details = '<failed to jsonify>';
  }

  document.dispatchEvent(
    new CustomEvent('inboxSDKinjectedEventSdkPassive', {
      bubbles: false,
      cancelable: false,
      detail: { name, details, sensitive },
    }),
  );
}
