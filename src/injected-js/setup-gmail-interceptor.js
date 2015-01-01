var _ = require('lodash');
var XHRProxyFactory = require('./xhr-proxy-factory');
var threadIdentifier = require('./thread-identifier');

function setupGmailInterceptor() {
  threadIdentifier.setup();

  var win = top.document.getElementById('js_frame').contentDocument.defaultView;
  var originalXHR = win.XMLHttpRequest;

  var wrappers = [];
  var XHRProxy = XHRProxyFactory(originalXHR, wrappers);
  win.XMLHttpRequest = XHRProxy;

  //email sending notifier
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

  wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.search && connection.params.view === 'tl';
    },
    responseTextChanger: function(connection) {
      // Presence of a responseTextChanger blocks Gmail from getting the partial
      // values as this loads. We want our originalResponseTextLogger to run
      // before Gmail has seen any of the response.
      return connection.originalResponseText;
    },
    originalResponseTextLogger: function(connection) {
      if (connection.status === 200) {
        var search = connection.params.search;
        var responseText = connection.originalResponseText;

        threadIdentifier.processThreadListResponse(responseText);
      }
    }
  });

  /*
    Search
   */
  wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.search && connection.params.view === 'tl' &&
        connection.params.q != null;
    },
    originalSendBodyLogger: function(connection, body) {
      triggerEvent({
        type: 'sendingSearchRequest',
        searchTerm: connection.params.q
      });
    }
  });
}

function triggerEvent(detail) {
  var event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxSDKajaxIntercept', true, false, detail);
  document.dispatchEvent(event);
}

module.exports = setupGmailInterceptor;
