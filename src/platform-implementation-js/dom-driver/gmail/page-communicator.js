var _ = require('lodash');
var RSVP = require('rsvp');
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

  getCurrentThreadID: function(threadContainerElement, isPreviewedThread){
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKtellMeCurrentThreadId', true, false, {isPreviewedThread: isPreviewedThread});
    threadContainerElement.dispatchEvent(event);

    return threadContainerElement.getAttribute('data-inboxsdk-currentthreadid');
  },

  getUserEmailAddress: _.once(function() {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }),

  getUserLanguage: _.once(function() {
    return document.head.getAttribute('data-inboxsdk-user-language');
  }),

  getUserOriginalPreviewPaneMode: _.once(function() {
    return document.head.getAttribute('data-inboxsdk-user-preview-pane-mode');
  }),

  getIkValue: _.once(() => document.head.getAttribute('data-inboxsdk-ik-value')),

  isConversationViewDisabled() {
    return new RSVP.Promise((resolve, reject) => {
      Bacon.fromEventTarget(document, 'inboxSDKgmonkeyResponse')
        .take(1)
        .onValue(event => {
          resolve(event.detail);
        });

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKtellMeIsConversationViewDisabled', false, false, null);
      document.dispatchEvent(event);
    });
  },

  announceSearchAutocompleter: function(providerID) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKregisterSuggestionsModifier', false, false, {
      providerID
    });
    document.dispatchEvent(event);
  },

  provideAutocompleteSuggestions: function(providerID, query, suggestions) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKprovideSuggestions', false, false, {
      providerID, query, suggestions
    });
    document.dispatchEvent(event);
  },

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
