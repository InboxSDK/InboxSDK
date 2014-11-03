require('./error-logging').setupGlobalLogger();

// exposes main as a global for browsers
window.InboxSDK = require('./inboxsdk');
