export default function logError(err, details) {
  if (!err) {
    err = new Error("No error given");
  }
  console.error("Error in injected script", err, details);
  try {
    JSON.stringify(details);
  } catch (e) {
    details = "<failed to jsonify>";
  }

  const event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxSDKinjectedError', true, false, {
    message: err && err.message,
    stack: err && err.stack,
    details: details
  });
  document.dispatchEvent(event);
}
