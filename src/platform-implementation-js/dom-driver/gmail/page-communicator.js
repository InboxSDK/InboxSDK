/* @flow */
// jshint ignore:start

import type {AutoCompleteSuggestion} from '../../../injected-js/modify-suggestions';

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
      threadRow.dispatchEvent(new CustomEvent('inboxSDKtellMeThisThreadId', {
        bubbles: true,
        cancelable: false,
        detail: null
      }));
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  getCurrentThreadID(threadContainerElement: HTMLElement, isPreviewedThread: boolean=false): string {
    threadContainerElement.dispatchEvent(new CustomEvent('inboxSDKtellMeCurrentThreadId', {
      bubbles: true,
      cancelable: false,
      detail: {isPreviewedThread}
    }));

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

      document.dispatchEvent(new CustomEvent('inboxSDKtellMeIsConversationViewDisabled', {
        bubbles: false,
        cancelable: false,
        detail: null
      }));
    });
  }

  announceSearchAutocompleter(providerID: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKregisterSuggestionsModifier', {
      bubbles: false,
      cancelable: false,
      detail: {providerID}
    }));
  }

  provideAutocompleteSuggestions(providerID: string, query: string, suggestions: AutoCompleteSuggestion[]) {
    document.dispatchEvent(new CustomEvent('inboxSDKprovideSuggestions', {
      bubbles: false,
      cancelable: false,
      detail: {providerID, query, suggestions}
    }));
  }

  setupCustomListResultsQuery(query: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKcustomListRegisterQuery', {
      bubbles: false,
      cancelable: false,
      detail: {query}
    }));
  }

  setCustomListNewQuery(query: string, newQuery: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKcustomListNewQuery', {
      bubbles: false,
      cancelable: false,
      detail: {query, newQuery}
    }));
  }

  setCustomListResults(query: string, newResults: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKcustomListResults', {
      bubbles: false,
      cancelable: false,
      detail: {query, newResults}
    }));
  }

  createCustomSearchTerm(term: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKcreateCustomSearchTerm', {
      bubbles: false,
      cancelable: false,
      detail: {term}
    }));
  }

  setSearchQueryReplacement(query: string, newQuery: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKsearchReplacementReady', {
      bubbles: false,
      cancelable: false,
      detail: {query, newQuery}
    }));
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
