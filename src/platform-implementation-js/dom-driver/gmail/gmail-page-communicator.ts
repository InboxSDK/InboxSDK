import { AutocompleteSearchResultWithId } from '../../../injected-js/gmail/modify-suggestions';
import CommonPageCommunicator from '../../lib/common-page-communicator';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

import Kefir from 'kefir';

// This is intended to be instantiated from makeXhrInterceptor, since it depends
// on the injected script, and if it's not instantiated elsewhere, you know that
// if you have an instance of this, then the injected script is present and this
// will work.
export default class GmailPageCommunicator extends CommonPageCommunicator {
  public async getMessageDate(
    threadId: string,
    message: HTMLElement
  ): Promise<number | null> {
    return this._getMessageData(
      threadId,
      message,
      'data-inboxsdk-sortdate',
      'inboxSDKtellMeThisMessageDate'
    );
  }

  public async getMessageRecipients(
    threadId: string,
    message: HTMLElement
  ): Promise<Array<{
    emailAddress: string;
    name: string | null | undefined;
  }> | null> {
    return this._getMessageData(
      threadId,
      message,
      'data-inboxsdk-recipients',
      'inboxSDKtellMeThisMessageRecipients'
    );
  }

  private async _getMessageData<T>(
    threadId: string,
    message: HTMLElement,
    attribute: string,
    eventName: string
  ): Promise<T | null> {
    let data = message.getAttribute(attribute);
    if (!data) {
      const [btaiHeader, xsrfToken] = this.isUsingSyncAPI()
        ? await Promise.all([this.getBtaiHeader(), this.getXsrfToken()])
        : [null, null];
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
        })
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

  public getThreadIdForThreadRowByDatabase(
    threadRow: HTMLElement
  ): string | null {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      threadRow.dispatchEvent(
        new CustomEvent('inboxSDKtellMeThisThreadIdByDatabase', {
          bubbles: true,
          cancelable: false,
          detail: null,
        })
      );
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  public getThreadIdForThreadRowByClick(threadRow: HTMLElement): string | null {
    let threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    if (!threadid) {
      threadRow.dispatchEvent(
        new CustomEvent('inboxSDKtellMeThisThreadIdByClick', {
          bubbles: true,
          cancelable: false,
          detail: null,
        })
      );
      threadid = threadRow.getAttribute('data-inboxsdk-threadid');
    }
    return threadid;
  }

  public getCurrentThreadID(
    threadContainerElement: HTMLElement,
    isPreviewedThread: boolean = false
  ): string {
    threadContainerElement.dispatchEvent(
      new CustomEvent('inboxSDKtellMeCurrentThreadId', {
        bubbles: true,
        cancelable: false,
        detail: { isPreviewedThread },
      })
    );

    const s = threadContainerElement.getAttribute(
      'data-inboxsdk-currentthreadid'
    );
    if (s == null) throw new Error('Failed to read value');
    return s;
  }

  public getUserOriginalPreviewPaneMode(): string | null {
    return document.head.getAttribute('data-inboxsdk-user-preview-pane-mode');
  }

  public getActionTokenValue(): string {
    const s = document.head.getAttribute('data-inboxsdk-action-token-value');
    if (s == null) throw new Error('Failed to read value');
    return s;
  }

  public isUsingSyncAPI(): boolean {
    const s = document.head.getAttribute('data-inboxsdk-using-sync-api');
    if (s == null) throw new Error('Failed to read value');
    return s === 'true';
  }

  public isConversationViewDisabled(): Promise<boolean> {
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
        })
      );
    });
  }

  public registerSuggestionsModifier(providerID: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKregisterSuggestionsModifier', {
        bubbles: false,
        cancelable: false,
        detail: { providerID },
      })
    );
  }

  public provideAutocompleteSuggestions(
    providerID: string,
    query: string,
    suggestions: AutocompleteSearchResultWithId[]
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
      })
    );
  }

  public setupCustomListResultsQuery(query: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcustomListRegisterQuery', {
        bubbles: false,
        cancelable: false,
        detail: { query },
      })
    );
  }

  public setCustomListNewQuery(detail: {
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
      })
    );
  }

  public setCustomListResults(query: string, newResults: string | null) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcustomListResults', {
        bubbles: false,
        cancelable: false,
        detail: { query, newResults },
      })
    );
  }

  public createCustomSearchTerm(term: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKcreateCustomSearchTerm', {
        bubbles: false,
        cancelable: false,
        detail: { term },
      })
    );
  }

  public setSearchQueryReplacement(query: string, newQuery: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKsearchReplacementReady', {
        bubbles: false,
        cancelable: false,
        detail: { query, newQuery },
      })
    );
  }

  public registerComposeRequestModifier(keyId: string, appId: string): string {
    const modifierId = new Date().getTime() + '_' + appId + '_' + Math.random();

    const detail: any = { modifierId };
    if (this.isUsingSyncAPI()) {
      detail.draftID = keyId;
    } else {
      detail.composeid = keyId;
    }

    document.dispatchEvent(
      new CustomEvent('inboxSDKregisterComposeRequestModifier', {
        detail,
        bubbles: false,
        cancelable: false,
      })
    );

    return modifierId;
  }

  public unregisterComposeRequestModifier(keyId: string, modifierId: string) {
    document.dispatchEvent(
      new CustomEvent('inboxSDKunregisterComposeRequestModifier', {
        detail: { keyId, modifierId },
        bubbles: false,
        cancelable: false,
      })
    );
  }

  public modifyComposeRequest(
    keyId: string,
    modifierId: string,
    composeParams: any
  ) {
    const detail: any = { modifierId, composeParams };
    if (this.isUsingSyncAPI()) detail.draftID = keyId;
    else detail.composeid = keyId;

    document.dispatchEvent(
      new CustomEvent('inboxSDKcomposeRequestModified', {
        detail,
        bubbles: false,
        cancelable: false,
      })
    );
  }
}
