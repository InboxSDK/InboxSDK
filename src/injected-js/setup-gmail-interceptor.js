var _ = require('lodash');
var XHRProxyFactory = require('./xhr-proxy-factory');
var GmailResponseProcessor = require('../platform-implementation-js/dom-driver/gmail/gmail-response-processor');
var htmlToText = require('../common/html-to-text');
var threadRowParser = require('./thread-row-parser');

function setupGmailInterceptor() {
  processPreloadedThreads();

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

  wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.search && connection.params.view === 'tl';
    },
    // originalSendBodyLogger: function(connection) {
    //   triggerEvent({
    //     type: 'threadListStart',
    //     q: connection.params.q
    //   });
    // },
    afterListeners: function(connection) {
      if (connection.status === 200) {
        var search = connection.params.search;
        var responseText = connection.originalResponseText;

        processThreadListResponse(responseText);
      }
    }
  });

  document.addEventListener('inboxSDKtellMeThisThreadId', function(event) {
    event.target.setAttribute('data-inboxsdk-threadid',
      getGmailThreadIdForThreadRow(event.target));
  });
}

function getGmailThreadIdForThreadRow(threadRow){
  var domRowMetadata = threadRowParser.extractMetadataFromThreadRow(threadRow);
  var threadRowMetadata = _.find(threadMetadatas, function(threadMetadata) {
    return domRowMetadata.subject === threadMetadata.subject &&
      domRowMetadata.timeString === threadMetadata.timeString &&
      domRowMetadata.peopleHtml === threadMetadata.peopleHtml;
  });
  if (threadRowMetadata) {
    return threadRowMetadata.gmailThreadId;
  }
}

function processThreadListResponse(threadListResponse) {
  GmailResponseProcessor.extractThreads(threadListResponse).forEach(function(thread) {
    storeThreadMetadata(convertToThreadMetadata(thread));
  });
}

function processPreloadedThreads() {
  var preloadScript = _.find(document.querySelectorAll('script:not([src])'), function(script) {
    return script.text && script.text.slice(0,100).indexOf('var VIEW_DATA=[[') > -1;
  });
  if (!preloadScript) {
    setTimeout(function() {
      throw new Error("Could not read preloaded VIEW_DATA");
    }, 1);
  } else {
    processThreadListResponse(preloadScript.text);
  }
}

// BB.Services.Threads.ThreadStorer.setThreadMetaData(threadMetadata.hexGmailThreadId, threadMetadata);
var threadMetadatas = {};
function storeThreadMetadata(threadMetadata) {
  threadMetadatas[threadMetadata.gmailThreadId] = threadMetadata;
}

function convertToThreadMetadata(thread) {
  var threadMetadata = {
    gmailThreadId: thread[0],
    subjectHtml: thread[9],
    subject: htmlToText(thread[9]),
    shortDate: htmlToText(thread[14]),
    timeString: htmlToText(thread[15]),
    peopleHtml: thread[7],
    timestamp: thread[16] / 1000,
    isUnread: thread[9].indexOf('<b>') > -1,
    lastEmailAddress: thread[28],
    bodyHtml: thread[10],
    people: [],
    someMessageIds: [thread[1], thread[2]]
  };

  var containerDiv = document.createElement('div');
  containerDiv.innerHTML = threadMetadata.peopleHtml;

  Array.prototype.forEach.call(containerDiv.querySelectorAll('span[email]'), function(span) {
    threadMetadata.people.push({
      name: span.textContent,
      email: span.getAttribute('email')
    });
  });

  return threadMetadata;
}

function triggerEvent(detail) {
  var event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxSDKajaxIntercept', true, false, detail);
  document.dispatchEvent(event);
}

module.exports = setupGmailInterceptor;
