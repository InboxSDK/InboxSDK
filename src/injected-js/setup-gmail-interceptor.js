function setupGmailInterceptor() {
  var XHRProxyFactory = require('./xhr-proxy-factory');

  var win = top.document.getElementById('js_frame').contentDocument.defaultView;
  var originalXHR = win.XMLHttpRequest;

  var wrappers = [];
  var XHRProxy = XHRProxyFactory(originalXHR, wrappers);
  win.XMLHttpRequest = XHRProxy;

  wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.act === 'sm';
    },
    originalSendBodyLogger: function(connection, body) {
      triggerEvent({
        type: 'emailSending',
        body: body
      });
    },
    afterListeners: function(connection) {
      if(connection.status === 200) {
        triggerEvent({
          type: 'emailSent',
          responseText: connection.originalResponseText,
          originalSendBody: connection.originalSendBody
        });
      }
    }
  });
}

function triggerEvent(detail) {
  var event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxSDKajaxIntercept', true, false, detail);
  document.dispatchEvent(event);
}

module.exports = setupGmailInterceptor;
