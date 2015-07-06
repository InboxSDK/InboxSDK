/* @flow */
// jshint ignore:start

type AutoCompleteSuggestion = {
  name?: ?string;
  nameHTML?: ?string;
  routeName?: ?string;
  externalURL?: ?string;
  searchTerm?: ?string;
  owner: string;
};

import type {ajaxOpts} from '../../../common/ajax';

import _ from 'lodash';
import asap from 'asap';
import RSVP from 'rsvp';
import Bacon from 'baconjs';
import Kefir from 'kefir';
import Logger from '../../lib/logger';

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
export default class PageCommunicator {
  ajaxInterceptStream: Bacon.Observable;

  constructor() {
    this.ajaxInterceptStream = Bacon
      .fromEventTarget(document, 'inboxSDKajaxIntercept')
      .map('.detail');
  }

  resolveUrlRedirects(url: string): Promise<string> {
    return this.pageAjax({url, method: 'HEAD'}).then(result => result.responseURL);
  }

  pageAjax(opts: ajaxOpts): Promise<{text: string, responseURL: string}> {
    var id = `${Date.now()}-${Math.random()}`;
    var promise = Kefir.fromEvents(document, 'inboxSDKpageAjaxDone')
      .filter(event => event.detail && event.detail.id === id)
      .take(1)
      .flatMap(event => {
        if (event.detail.error) {
          var err = Object.assign(
            (new Error(event.detail.message || "Connection error"): any),
            {status: event.detail.status}
          );
          if (event.detail.stack) {
            err.stack = event.detail.stack;
          }
          return Kefir.constantError(err);
        } else {
          return Kefir.constant({
            text: event.detail.text,
            responseURL: event.detail.responseURL
          });
        }
      })
      .toPromise(RSVP.Promise);

    document.dispatchEvent(new CustomEvent('inboxSDKpageAjax', {
      bubbles: false, cancelable: false,
      detail: Object.assign({}, opts, {id})
    }));

    return promise;
  }

  getThreadIdForThreadRow(threadRow: HTMLElement): string {
    var threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      var event = new CustomEvent('inboxSDKtellMeThisThreadId', {
        bubbles: true,
        cancelable: false,
        detail: null
      });
      threadRow.dispatchEvent(event);
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  getCurrentThreadID(threadContainerElement: HTMLElement, isPreviewedThread: boolean=false): string {
    var event = new CustomEvent('inboxSDKtellMeCurrentThreadId', {
      bubbles: true,
      cancelable: false,
      detail: {isPreviewedThread}
    });
    threadContainerElement.dispatchEvent(event);

    return threadContainerElement.getAttribute('data-inboxsdk-currentthreadid');
  }

  getUserEmailAddress(): string {
    return document.head.getAttribute('data-inboxsdk-user-email-address');
  }

  getUserLanguage(): string {
    return document.head.getAttribute('data-inboxsdk-user-language');
  }

  getUserOriginalPreviewPaneMode(): string {
    return document.head.getAttribute('data-inboxsdk-user-preview-pane-mode');
  }

  getIkValue(): string {
    return document.head.getAttribute('data-inboxsdk-ik-value');
  }

  isConversationViewDisabled(): Promise<boolean> {
    return new RSVP.Promise((resolve, reject) => {
      Bacon.fromEventTarget(document, 'inboxSDKgmonkeyResponse')
        .take(1)
        .onValue(event => {
          resolve(event.detail);
        });

      var event = new CustomEvent('inboxSDKtellMeIsConversationViewDisabled', {
        bubbles: false,
        cancelable: false,
        detail: null
      });
      document.dispatchEvent(event);
    });
  }

  announceSearchAutocompleter(providerID: string) {
    var event = new CustomEvent('inboxSDKregisterSuggestionsModifier', {
      bubbles: false,
      cancelable: false,
      detail: {providerID}
    });
    document.dispatchEvent(event);
  }

  provideAutocompleteSuggestions(providerID: string, query: string, suggestions: AutoCompleteSuggestion[]) {
    var event = new CustomEvent('inboxSDKprovideSuggestions', {
      bubbles: false,
      cancelable: false,
      detail: {providerID, query, suggestions}
    });
    document.dispatchEvent(event);
  }

  setupCustomListResultsQuery(query: string) {
    var event = new CustomEvent('inboxSDKcustomListRegisterQuery', {
      bubbles: false,
      cancelable: false,
      detail: {query}
    });
    document.dispatchEvent(event);
  }

  setCustomListNewQuery(query: string, newQuery: string) {
    var event = new CustomEvent('inboxSDKcustomListNewQuery', {
      bubbles: false,
      cancelable: false,
      detail: {query, newQuery}
    });
    document.dispatchEvent(event);
  }

  setCustomListResults(query: string, newResults: string) {
    var event = new CustomEvent('inboxSDKcustomListResults', {
      bubbles: false,
      cancelable: false,
      detail: {query, newResults}
    });
    document.dispatchEvent(event);
  }

  createCustomSearchTerm(term: string) {
    var event = new CustomEvent('inboxSDKcreateCustomSearchTerm', {
      bubbles: false,
      cancelable: false,
      detail: {term}
    });
    document.dispatchEvent(event);
  }

  setSearchQueryReplacement(query: string, newQuery: string) {
    var event = new CustomEvent('inboxSDKsearchReplacementReady', {
      bubbles: false,
      cancelable: false,
      detail: {query, newQuery}
    });
    document.dispatchEvent(event);
  }

  silenceGmailErrorsForAMoment(): ()=>void {
    document.dispatchEvent(new CustomEvent('inboxSDKsilencePageErrors', {
      bubbles: false, cancelable: false, detail: null
    }));
    // create error here for stacktrace
    var error = new Error("Forgot to unsilence gmail errors");
    var unsilenced = false;
    var unsilence = _.once(() => {
      unsilenced = true;
      document.dispatchEvent(new CustomEvent('inboxSDKunsilencePageErrors', {
        bubbles: false,
        cancelable: false,
        detail: null
      }));
    });
    asap(() => {
      if (!unsilenced) {
        Logger.error(error);
        unsilence();
      }
    });
    return unsilence;
  }
}
