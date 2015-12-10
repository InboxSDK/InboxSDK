/* @flow */
// jshint ignore:start

import type {AutoCompleteSuggestion} from '../../../injected-js/modify-suggestions';
import CommonPageCommunicator from '../../lib/common-page-communicator';

import _ from 'lodash';
import asap from 'asap';
import RSVP from 'rsvp';
import * as Bacon from 'baconjs';
import Kefir from 'kefir';
import Logger from '../../lib/logger';

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
export default class GmailPageCommunicator extends CommonPageCommunicator {
  ajaxInterceptStream: Bacon.Observable;

  constructor() {
    super();
    this.ajaxInterceptStream = Bacon
      .fromEventTarget(document, 'inboxSDKajaxIntercept')
      .map(x => x.detail);
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

  getUserOriginalPreviewPaneMode(): string {
    return document.head.getAttribute('data-inboxsdk-user-preview-pane-mode');
  }

  getIkValue(): string {
    const ownIk = document.head.getAttribute('data-inboxsdk-ik-value');
    if (ownIk) {
      return ownIk;
    }
    // For standalone windows.
    if (window.opener) {
      return window.opener.document.head.getAttribute('data-inboxsdk-ik-value');
    }
    throw new Error("Failed to look up Gmail 'ik' value");
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

  setCustomListResults(query: string, newResults: ?string) {
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

  registerComposeRequestModifier(composeid: string, appId: string): string{
    const modifierId = (new Date()).getTime() + '_' + appId + '_' + Math.random();

    document.dispatchEvent(new CustomEvent('inboxSDKregisterComposeRequestModifier', {
      bubbles: false,
      cancelable: false,
      detail: {composeid, modifierId}
    }));

    return modifierId;
  }

  modifyComposeRequest(composeid: string, modifierId: string, composeParams: Object){
    document.dispatchEvent(new CustomEvent('inboxSDKcomposeRequestModified', {
      bubbles: false,
      cancelable: false,
      detail:{composeid, modifierId, composeParams}
    }));
  }
}
