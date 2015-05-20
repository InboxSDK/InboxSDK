import _ from 'lodash';
import RSVP from 'rsvp';
import Bacon from 'baconjs';

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
export default class PageCommunicator {
  constructor() {
    this.ajaxInterceptStream = Bacon
      .fromEventTarget(document, 'inboxSDKajaxIntercept')
      .map('.detail');
  }

  resolveUrlRedirects(url) {
    const promise = Bacon.fromEvent(document, 'inboxSDKresolveURLdone')
      .filter(event => event.detail && event.detail.url === url)
      .first()
      .flatMap(event => {
        if (event.detail.success) {
          return Bacon.once(event.detail.responseURL);
        } else {
          return Bacon.once(new Bacon.Error(new Error("Connection error")));
        }
      })
      .toPromise(RSVP.Promise);

    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKresolveURL', false, false, {url});
    document.dispatchEvent(event);

    return promise;
  }

  getThreadIdForThreadRow(threadRow) {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      const event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKtellMeThisThreadId', true, false, null);
      threadRow.dispatchEvent(event);
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  getCurrentThreadID(threadContainerElement, isPreviewedThread){
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKtellMeCurrentThreadId', true, false, {isPreviewedThread: isPreviewedThread});
    threadContainerElement.dispatchEvent(event);

    return threadContainerElement.getAttribute('data-inboxsdk-currentthreadid');
  }

  getUserEmailAddress() {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }

  getUserName() {
    return document.head.getAttribute('data-inboxsdk-user-name');
  }

  getUserLanguage() {
    return document.head.getAttribute('data-inboxsdk-user-language');
  }

  getUserOriginalPreviewPaneMode() {
    return document.head.getAttribute('data-inboxsdk-user-preview-pane-mode');
  }

  getIkValue() {
    return document.head.getAttribute('data-inboxsdk-ik-value');
  }

  isConversationViewDisabled() {
    return new RSVP.Promise((resolve, reject) => {
      Bacon.fromEventTarget(document, 'inboxSDKgmonkeyResponse')
        .take(1)
        .onValue(event => {
          resolve(event.detail);
        });

      const event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKtellMeIsConversationViewDisabled', false, false, null);
      document.dispatchEvent(event);
    });
  }

  announceSearchAutocompleter(providerID) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKregisterSuggestionsModifier', false, false, {
      providerID
    });
    document.dispatchEvent(event);
  }

  provideAutocompleteSuggestions(providerID, query, suggestions) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKprovideSuggestions', false, false, {
      providerID, query, suggestions
    });
    document.dispatchEvent(event);
  }

  setupCustomListResultsQuery(query) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKcustomListRegisterQuery', false, false, {
      query
    });
    document.dispatchEvent(event);
  }

  setCustomListNewQuery(query, newQuery) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKcustomListNewQuery', false, false, {
      query, newQuery
    });
    document.dispatchEvent(event);
  }

  setCustomListResults(query, newResults) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKcustomListResults', false, false, {
      query, newResults
    });
    document.dispatchEvent(event);
  }

  createCustomSearchTerm(term) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKcreateCustomSearchTerm', false, false, {
      term: term
    });
    document.dispatchEvent(event);
  }

  setSearchQueryReplacement(query, newQuery) {
    const event = document.createEvent('CustomEvent');
    event.initCustomEvent('inboxSDKsearchReplacementReady', false, false, {
      query: query, newQuery: newQuery
    });
    document.dispatchEvent(event);
  }
}
