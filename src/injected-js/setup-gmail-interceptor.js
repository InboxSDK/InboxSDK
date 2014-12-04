var _ = require('lodash');
var XHRProxyFactory = require('./xhr-proxy-factory');
var GmailResponseProcessor = require('../platform-implementation-js/dom-driver/gmail/gmail-response-processor');
var htmlToText = require('../common/html-to-text');
var threadRowParser = require('./thread-row-parser');
var deparam = require('querystring').parse;

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
  var threadRowMetadataCandidates = _.filter(threadMetadatas, function(threadMetadata) {
    return domRowMetadata.subject === threadMetadata.subject &&
      domRowMetadata.timeString === threadMetadata.timeString &&
      domRowMetadata.peopleHtml === threadMetadata.peopleHtml;
  });
  if (threadRowMetadataCandidates.length === 1) {
    return threadRowMetadataCandidates[0].gmailThreadId;
  } else {
    // Simulate a ctrl-click on the thread row to get the thread id, then
    // simulate a ctrl-click on the previously selected thread row (or the
    // first thread row) to put the cursor back where it was.
    var currentRowSelection = threadRow.parentNode.querySelector('td.PE') || threadRow.parentNode.querySelector('tr');
    var threadId = deparam(ctrlClickAndGetPopupUrl(threadRow)).th;
    if (currentRowSelection) {
      ctrlClickAndGetPopupUrl(currentRowSelection);
    }
    return threadId;
  }
}

function ctrlClickAndGetPopupUrl(element) {
  var event = document.createEvent('MouseEvents');
  var options = {
    bubbles: true, cancelable: true, button: 0, pointerX: 0, pointerY: 0,
    ctrlKey: true, altKey: false, shiftKey: false, metaKey: true
  };
  event.initMouseEvent(
    'click', options.bubbles, options.cancelable, document.defaultView,
    options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
    options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, null);

  var url;
  var oldWindowOpen = window.open;
  try {
    window.open = function(_url, title, options) {
      url = _url;
      var newWin = {
        closed: false, focus: _.noop
      };
      setTimeout(function() {
        newWin.closed = true;
      }, 5);
      return newWin;
    };
    element.dispatchEvent(event);
  } finally {
    window.open = oldWindowOpen;
  }
  return url;
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
    peopleHtml: thread[7].replace(/(<span[^>]*) class="[^"]*"/g, '$1'),
    timestamp: thread[16] / 1000,
    // isUnread: thread[9].indexOf('<b>') > -1,
    // lastEmailAddress: thread[28],
    // people: [],
    // someMessageIds: [thread[1], thread[2]],
    bodyHtml: thread[10]
  };

  // var containerDiv = document.createElement('div');
  // containerDiv.innerHTML = threadMetadata.peopleHtml;
  //
  // Array.prototype.forEach.call(containerDiv.querySelectorAll('span[email]'), function(span) {
  //   threadMetadata.people.push({
  //     name: span.textContent,
  //     email: span.getAttribute('email')
  //   });
  // });

  return threadMetadata;
}

function triggerEvent(detail) {
  var event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxSDKajaxIntercept', true, false, detail);
  document.dispatchEvent(event);
}

module.exports = setupGmailInterceptor;
