var _ = require('lodash');
var GmailResponseProcessor = require('../../platform-implementation-js/dom-driver/gmail/gmail-response-processor');
var deparam = require('querystring').parse;
var threadRowParser = require('./thread-row-parser');
var clickAndGetPopupUrl = require('./click-and-get-popup-url');
var Marker = require('../../common/marker');

function setup() {
  processPreloadedThreads();

  document.addEventListener('inboxSDKtellMeThisThreadId', function(event) {
    var threadId = getGmailThreadIdForThreadRow(event.target);
    if (threadId) {
      event.target.setAttribute('data-inboxsdk-threadid', threadId);
    }
  });
}
exports.setup = setup;

function processThreadListResponse(threadListResponse) {
  GmailResponseProcessor.extractThreads(threadListResponse).forEach(function(thread) {
    storeThreadMetadata(thread);
  });
}
exports.processThreadListResponse = processThreadListResponse;

var AMBIGUOUS = Marker('ABIGUOUS');
var threadIdsByKey = {};
function storeThreadMetadata(threadMetadata) {
  var key = threadMetadataKey(threadMetadata);
  if (_.has(threadIdsByKey, key)) {
    if (threadIdsByKey[key] !== threadMetadata.gmailThreadId) {
      threadIdsByKey[key] = AMBIGUOUS;
    }
  } else {
    threadIdsByKey[key] = threadMetadata.gmailThreadId;
  }
}

function threadMetadataKey(threadMetadata) {
  return threadMetadata.subject.trim()+':'+threadMetadata.timeString.trim()+':'+threadMetadata.peopleHtml.trim();
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

function getThreadIdFromUrl(url) {
  var tid = deparam(url).th;
  if (!tid) {
    // Draft URLs have the thread id after the hash
    var urlHashMatch = url.match(/#(.*)/);
    if (urlHashMatch) {
      url = decodeURIComponent(decodeURIComponent(urlHashMatch[1]));
      tid = deparam(url).th;
    }
  }
  return tid;
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
  var url = clickAndGetPopupUrl(threadRow);
  var threadId = url && getThreadIdFromUrl(url);
  if (threadId && !_.has(threadIdsByKey, key)) {
    threadIdsByKey[key] = threadId;
  }
  if (currentRowSelection) {
    clickAndGetPopupUrl(currentRowSelection);
  }
  return threadId;
}
