var threadMetadataOracle = {
  getThreadIdForThreadRow: function(threadRow) {
    var threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKtellMeThisThreadId', true, false, null);
      threadRow.dispatchEvent(event);
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }
};

module.exports = threadMetadataOracle;
