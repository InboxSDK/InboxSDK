var _ = require('lodash');
var Bacon = require('baconjs');

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
function PageCommunicator() {
  this.ajaxInterceptStream = Bacon
    .fromEventTarget(document, 'inboxSDKajaxIntercept')
    .map('.detail');
}

PageCommunicator.prototype = {
  getThreadIdForThreadRow: function(threadRow) {
    var threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKtellMeThisThreadId', true, false, null);
      threadRow.dispatchEvent(event);
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  },

  getCurrentThreadID: function(threadContainerElement){
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKtellMeCurrentThreadId', true, false, null);
    threadContainerElement.dispatchEvent(event);
    return threadContainerElement.getAttribute('data-inboxsdk-currentthreadid');
  },

  getUserEmailAddress: _.once(function() {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }),

  createCustomSearchTerm: function(term) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKcreateCustomSearchTerm', false, false, {
      term: term
    });
    document.dispatchEvent(event);
  },

  setSearchQueryReplacement: function(query, newQuery) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKsearchReplacementReady', false, false, {
      query: query, newQuery: newQuery
    });
    document.dispatchEvent(event);
  }
};

module.exports = PageCommunicator;
