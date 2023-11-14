import { AutocompleteSearchResultWithId } from '../../../injected-js/gmail/modify-suggestions';
import { CustomDomEvent } from '../../lib/dom/custom-events';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

import Kefir, { type Observable } from 'kefir';

import asap from 'asap';
import once from 'lodash/once';
import { CommonAjaxOpts } from '../../../common/ajax';
import Logger from '../../lib/logger';

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
export default class GmailPageCommunicator {
  ajaxInterceptStream: Observable<any, never>;

  constructor() {
    this.ajaxInterceptStream = Kefir.fromEvents<any, never>(
      document,
      'inboxSDKajaxIntercept',
    ).map((x) => x.detail);
  }

  getUserEmailAddress(): string {
    const s = document.head.getAttribute('data-inboxsdk-user-email-address');
    if (typeof s !== 'string') throw new Error('should not happen');
    return s;
  }

  getUserLanguage(): string {
    const s = document.head.getAttribute('data-inboxsdk-user-language');
    if (typeof s !== 'string') throw new Error('should not happen');
    return s;
  }

  getIkValue(): string {
    const ownIk = document.head.getAttribute('data-inboxsdk-ik-value');
    if (ownIk) {
      return ownIk;
    }
    // For standalone windows.
    if (window.opener) {
      const openerIk = window.opener.document.head.getAttribute(
        'data-inboxsdk-ik-value',
      );
      if (openerIk) {
        return openerIk;
      } else {
        throw new Error("Failed to look up parent window 'ik' value");
      }
    }
    throw new Error("Failed to look up 'ik' value");
  }

  async getXsrfToken(): Promise<string> {
    const existingHeader = document.head.getAttribute(
      'data-inboxsdk-xsrf-token',
    );
    if (existingHeader) {
      return existingHeader;
    } else {
      await this.ajaxInterceptStream
        .filter(({ type }) => type === 'xsrfTokenHeaderReceived')
        .take(1)
        .toPromise();

      const newHeader = document.head.getAttribute('data-inboxsdk-xsrf-token');
      if (!newHeader) throw new Error('Failed to look up XSRF token');
      return newHeader;
    }
  }

  async getBtaiHeader(): Promise<string> {
    const existingHeader = document.head.getAttribute(
      'data-inboxsdk-btai-header',
    );
    if (existingHeader) {
      return existingHeader;
    } else {
      await this.ajaxInterceptStream
        .filter(({ type }) => type === 'btaiHeaderReceived')
        .take(1)
        .toPromise();

      const newHeader = document.head.getAttribute('data-inboxsdk-btai-header');
      if (!newHeader) throw new Error('Failed to look up BTAI header');
      return newHeader;
    }
  }

  resolveUrlRedirects(url: string): Promise<string> {
    return this.pageAjax({ url, method: 'HEAD' }).then(
      (result) => result.responseURL,
    );
  }

  pageAjax(
    opts: CommonAjaxOpts,
  ): Promise<{ text: string; responseURL: string }> {
    const id = `${Date.now()}-${Math.random()}`;
    const promise = Kefir.fromEvents(document, 'inboxSDKpageAjaxDone')
      .filter((event: any) => event.detail && event.detail.id === id)
      .take(1)
      .flatMap((event: any) => {
        if (event.detail.error) {
          const err = Object.assign(
            new Error(event.detail.message || 'Connection error') as any,
            { status: event.detail.status },
          );
          if (event.detail.stack) {
            err.stack = event.detail.stack;
          }
          return Kefir.constantError(err);
        } else {
          return Kefir.constant({
            text: event.detail.text,
            responseURL: event.detail.responseURL,
          });
        }
      })
      .toPromise();

    document.dispatchEvent(
      new CustomEvent('inboxSDKpageAjax', {
        bubbles: false,
        cancelable: false,
        detail: Object.assign({}, opts, { id }),
      }),
    );

    return promise;
  }

  silenceGmailErrorsForAMoment(): () => void {
    document.dispatchEvent(
      new CustomEvent('inboxSDKsilencePageErrors', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    );
    // create error here for stacktrace
    const error = new Error('Forgot to unsilence page errors');
    let unsilenced = false;
    const unsilence = once(() => {
      unsilenced = true;
      document.dispatchEvent(
        new CustomEvent('inboxSDKunsilencePageErrors', {
          bubbles: false,
          cancelable: false,
          detail: null,
        }),
      );
    });
    asap(() => {
      if (!unsilenced) {
        Logger.error(error);
        unsilence();
      }
    });
    return unsilence;
  }

  registerAllowedHashLinkStartTerm(term: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKregisterAllowedHashLinkStartTerm', {
        bubbles: false,
        cancelable: false,
        detail: { term },
      }),
    );
  }
  async getMessageDate(
    threadId: string,
    message: HTMLElement,
  ): Promise<number | null> {
    return this._getMessageData(
      threadId,
      message,
      'data-inboxsdk-sortdate',
      'inboxSDKtellMeThisMessageDate',
    );
  }

  async getMessageRecipients(
    threadId: string,
    message: HTMLElement,
  ): Promise<Array<{
    emailAddress: string;
    name: string | null | undefined;
  }> | null> {
    return this._getMessageData(
      threadId,
      message,
      'data-inboxsdk-recipients',
      'inboxSDKtellMeThisMessageRecipients',
    );
  }

  private async _getMessageData<T>(
    threadId: string,
    message: HTMLElement,
    attribute: string,
    eventName: string,
  ): Promise<T | null> {
    let data = message.getAttribute(attribute);
    if (!data) {
      const [btaiHeader, xsrfToken] = await Promise.all([
        this.getBtaiHeader(),
        this.getXsrfToken(),
      ]);
      message.dispatchEvent(
        new CustomEvent(eventName, {
          bubbles: true,
          cancelable: false,
          detail: {
            threadId,
            ikValue: this.getIkValue(),
            btaiHeader,
            xsrfToken,
          },
        }),
      );

      data = message.getAttribute(attribute);
      if (!data) {
        await makeMutationObserverChunkedStream(message, {
          attributes: true,
          attributeFilter: [attribute],
        })
          .take(1)
          .toPromise();
        data = message.getAttribute(attribute);
      }
    }

    if (data && data !== 'error') return JSON.parse(data);
    else return null;
  }

  getThreadIdForThreadRowByDatabase(threadRow: HTMLElement): string | null {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      threadRow.dispatchEvent(
        new CustomEvent(CustomDomEvent.tellMeThisThreadIdByDatabase, {
          bubbles: true,
          cancelable: false,
          detail: null,
        }),
      );
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  getThreadIdForThreadRowByClick(threadRow: HTMLElement): string | null {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      threadRow.dispatchEvent(
        new CustomEvent(CustomDomEvent.tellMeThisThreadIdByClick, {
          bubbles: true,
          cancelable: false,
          detail: null,
        }),
      );
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  getCurrentThreadID(
    threadContainerElement: HTMLElement,
    isPreviewedThread: boolean = false,
  ): string {
    threadContainerElement.dispatchEvent(
      new CustomEvent('inboxSDKtellMeCurrentThreadId', {
        bubbles: true,
        cancelable: false,
        detail: { isPreviewedThread },
      }),
    );

    const s = threadContainerElement.getAttribute(
      'data-inboxsdk-currentthreadid',
    );
    if (s == null) throw new Error('Failed to read value');
    return s;
  }

  getUserOriginalPreviewPaneMode(): string | null {
    return document.head.getAttribute('data-inboxsdk-user-preview-pane-mode');
  }

  getActionTokenValue(): string {
    const s = document.head.getAttribute('data-inboxsdk-action-token-value');
    if (s == null) throw new Error('Failed to read value');
    return s;
  }

  isConversationViewDisabled(): Promise<boolean> {
    return new Promise((resolve) => {
      Kefir.fromEvents<any, never>(document, 'inboxSDKgmonkeyResponse')
        .take(1)
        .onValue((event) => {
          resolve(event.detail);
        });

      document.dispatchEvent(
        new CustomEvent('inboxSDKtellMeIsConversationViewDisabled', {
          bubbles: false,
          cancelable: false,
          detail: null,
        }),
      );
    });
  }

  getGoogleRequestHeaders(): { [key: string]: string } {
    document.dispatchEvent(
      new CustomEvent('inboxSDKgetGoogleRequestHeaders', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    );
    const json = document.head.getAttribute('data-inboxsdk-google-headers');
    document.head.removeAttribute('data-inboxsdk-google-headers');
    if (!json) {
      throw new Error('Failed to get Google request auth headers');
    }
    return JSON.parse(json);
  }

  registerSuggestionsModifier(providerID: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKregisterSuggestionsModifier', {
        bubbles: false,
        cancelable: false,
        detail: { providerID },
      }),
    );
  }

  provideAutocompleteSuggestions(
    providerID: string,
    query: string,
    suggestions: AutocompleteSearchResultWithId[],
  ) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKprovideSuggestions', {
        bubbles: false,
        cancelable: false,
        detail: {
          providerID,
          query,
          // Filter out non-JSONifiable things
          suggestions: JSON.parse(JSON.stringify(suggestions)),
        },
      }),
    );
  }

  setupCustomListResultsQuery(query: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcustomListRegisterQuery', {
        bubbles: false,
        cancelable: false,
        detail: { query },
      }),
    );
  }

  setCustomListNewQuery(detail: {
    query: string;
    start: number;
    newQuery: string;
    newStart: number;
  }) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcustomListNewQuery', {
        bubbles: false,
        cancelable: false,
        detail,
      }),
    );
  }

  setCustomListResults(query: string, newResults: string | null) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcustomListResults', {
        bubbles: false,
        cancelable: false,
        detail: { query, newResults },
      }),
    );
  }

  createCustomSearchTerm(term: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcreateCustomSearchTerm', {
        bubbles: false,
        cancelable: false,
        detail: { term },
      }),
    );
  }

  setSearchQueryReplacement(query: string, newQuery: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKsearchReplacementReady', {
        bubbles: false,
        cancelable: false,
        detail: { query, newQuery },
      }),
    );
  }

  registerComposeRequestModifier(keyId: string, appId: string): string {
    const modifierId = new Date().getTime() + '_' + appId + '_' + Math.random();

    const detail: any = { modifierId };
    detail.draftID = keyId;

    document.dispatchEvent(
      new CustomEvent('inboxSDKregisterComposeRequestModifier', {
        detail,
        bubbles: false,
        cancelable: false,
      }),
    );

    return modifierId;
  }

  unregisterComposeRequestModifier(keyId: string, modifierId: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKunregisterComposeRequestModifier', {
        detail: { keyId, modifierId },
        bubbles: false,
        cancelable: false,
      }),
    );
  }

  modifyComposeRequest(keyId: string, modifierId: string, composeParams: any) {
    const detail = { modifierId, composeParams, draftID: keyId };

    document.dispatchEvent(
      new CustomEvent('inboxSDKcomposeRequestModified', {
        detail,
        bubbles: false,
        cancelable: false,
      }),
    );
  }
}
