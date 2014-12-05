var _ = require('lodash');
var GmailResponseProcessor = require('../../platform-implementation-js/dom-driver/gmail/gmail-response-processor');
var htmlToText = require('../../common/html-to-text');
var deparam = require('querystring').parse;
var threadRowParser = require('./thread-row-parser');
var cleanupPeopleLine = require('./cleanup-people-line');
var clickAndGetPopupUrl = require('./click-and-get-popup-url');
var Symbol = require('../../common/symbol');

function setup() {
  processPreloadedThreads();

  document.addEventListener('inboxSDKtellMeThisThreadId', function(event) {
    event.target.setAttribute(
      'data-inboxsdk-threadid',
      getGmailThreadIdForThreadRow(event.target)
    );
  });
}
exports.setup = setup;

function processThreadListResponse(threadListResponse) {
  GmailResponseProcessor.extractThreads(threadListResponse).forEach(function(thread) {
    storeThreadMetadata(convertToThreadMetadata(thread));
  });
}
exports.processThreadListResponse = processThreadListResponse;

var AMBIGUOUS = Symbol('ABIGUOUS');
var threadIdsByKey = {};
function storeThreadMetadata(threadMetadata) {
  var key = threadMetadataKey(threadMetadata);
  if (_.has(threadIdsByKey, key)) {
    threadIdsByKey[key] = AMBIGUOUS;
  } else {
    threadIdsByKey[key] = threadMetadata.gmailThreadId;
  }
}

function threadMetadataKey(threadMetadata) {
  return threadMetadata.subject+':'+threadMetadata.timeString+':'+threadMetadata.peopleHtml;
}

function convertToThreadMetadata(thread) {
  var threadMetadata = {
    // subjectHtml: thread[9],
    subject: htmlToText(thread[9]),
    // shortDate: htmlToText(thread[14]),
    timeString: htmlToText(thread[15]),
    peopleHtml: cleanupPeopleLine(thread[7]),
    // timestamp: thread[16] / 1000,
    // isUnread: thread[9].indexOf('<b>') > -1,
    // lastEmailAddress: thread[28],
    // someMessageIds: [thread[1], thread[2]],
    // bodyHtml: thread[10],
    gmailThreadId: thread[0]
  };

  return threadMetadata;
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

function getGmailThreadIdForThreadRow(threadRow){
  var domRowMetadata = threadRowParser.extractMetadataFromThreadRow(threadRow);
  var key = threadMetadataKey(domRowMetadata);
  if (_.has(threadIdsByKey, key) && threadIdsByKey[key] !== AMBIGUOUS) {
    return threadIdsByKey[key];
  }

  // Simulate a ctrl-click on the thread row to get the thread id, then
  // simulate a ctrl-click on the previously selected thread row (or the
  // first thread row) to put the cursor back where it was.
  var currentRowSelection = threadRow.parentNode.querySelector('td.PE') || threadRow.parentNode.querySelector('tr');
  var threadId = deparam(clickAndGetPopupUrl(threadRow)).th;
  if (currentRowSelection) {
    clickAndGetPopupUrl(currentRowSelection);
  }
  return threadId;
}
