/* @flow */

import type {AutocompleteSearchResultWithId} from '../../../injected-js/gmail/modify-suggestions';
import CommonPageCommunicator from '../../lib/common-page-communicator';

import asap from 'asap';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import Logger from '../../lib/logger';

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
export default class GmailPageCommunicator extends CommonPageCommunicator {

  getMessageDate(threadId: string, message: HTMLElement): ?number {
    let date = message.getAttribute('data-inboxsdk-sortdate');
    if(!date){
      message.dispatchEvent(new CustomEvent('inboxSDKtellMeThisMessageDate', {
        bubbles: true,
        cancelable: false,
        detail: {
          threadId
        }
      }));

      date = message.getAttribute('data-inboxsdk-sortdate');
    }

    if(date) return +date;
    else return null;
  }

  getThreadIdForThreadRowByDatabase(threadRow: HTMLElement): ?string {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      threadRow.dispatchEvent(new CustomEvent('inboxSDKtellMeThisThreadIdByDatabase', {
        bubbles: true,
        cancelable: false,
        detail: null
      }));
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  getThreadIdForThreadRowByClick(threadRow: HTMLElement): ?string {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      threadRow.dispatchEvent(new CustomEvent('inboxSDKtellMeThisThreadIdByClick', {
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

    const s = threadContainerElement.getAttribute('data-inboxsdk-currentthreadid');
    if (s == null) throw new Error('Failed to read value');
    return s;
  }

  getUserOriginalPreviewPaneMode(): ?string {
    return (document.head:any).getAttribute('data-inboxsdk-user-preview-pane-mode');
  }

  getActionTokenValue(): string {
    const s = (document.head:any).getAttribute('data-inboxsdk-action-token-value');
    if (s == null) throw new Error('Failed to read value');
    return s;
  }

  isUsingSyncAPI(): boolean {
    const s = (document.head:any).getAttribute('data-inboxsdk-using-sync-api');
    if (s == null) throw new Error('Failed to read value');
    return s === 'true';
  }

  isConversationViewDisabled(): Promise<boolean> {
    return new RSVP.Promise((resolve, reject) => {
      Kefir.fromEvents(document, 'inboxSDKgmonkeyResponse')
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

  registerSuggestionsModifier(providerID: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKregisterSuggestionsModifier', {
      bubbles: false,
      cancelable: false,
      detail: {providerID}
    }));
  }

  provideAutocompleteSuggestions(providerID: string, query: string, suggestions: AutocompleteSearchResultWithId[]) {
    document.dispatchEvent(new CustomEvent('inboxSDKprovideSuggestions', {
      bubbles: false,
      cancelable: false,
      detail: {
        providerID, query,
        // Filter out non-JSONifiable things
        suggestions: JSON.parse(JSON.stringify(suggestions))
      }
    }));
  }

  setupCustomListResultsQuery(query: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKcustomListRegisterQuery', {
      bubbles: false,
      cancelable: false,
      detail: {query}
    }));
  }

  setCustomListNewQuery(
    detail: {query: string, start: number, newQuery: string, newStart: number}
  ) {
    document.dispatchEvent(new CustomEvent('inboxSDKcustomListNewQuery', {
      bubbles: false,
      cancelable: false,
      detail
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

  registerComposeRequestModifier(keyId: string, appId: string): string{
    const modifierId = (new Date()).getTime() + '_' + appId + '_' + Math.random();

    const detail: Object = {modifierId};
    if(this.isUsingSyncAPI()) detail.draftID = keyId;
    else detail.composeid = keyId;

    document.dispatchEvent(new CustomEvent('inboxSDKregisterComposeRequestModifier', {
      detail,
      bubbles: false,
      cancelable: false
    }));

    return modifierId;
  }

  modifyComposeRequest(keyId: string, modifierId: string, composeParams: Object){
    const detail: Object = {modifierId, composeParams};
    if(this.isUsingSyncAPI()) detail.draftID = keyId;
    else detail.composeid = keyId;

    document.dispatchEvent(new CustomEvent('inboxSDKcomposeRequestModified', {
      detail,
      bubbles: false,
      cancelable: false
    }));
  }
}
