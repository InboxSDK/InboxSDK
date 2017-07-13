/* @flow */

import Kefir from 'kefir';
import CommonPageCommunicator from '../../lib/common-page-communicator';

export default class InboxPageCommunicator extends CommonPageCommunicator {
  ajaxInterceptStream: Kefir.Observable<Object>;

  constructor() {
    super();
    this.ajaxInterceptStream = Kefir
      .fromEvents(document, 'inboxSDKajaxIntercept')
      .map(x => x.detail);
  }

  getXsrfToken(): string {
    const token = (document.head:any).getAttribute('data-inboxsdk-xsrf-token');
    if (!token) throw new Error("Failed to look up xsrf token");

    return token;
  }

  async getBtaiHeader(): Promise<string> {
    const existingHeader = (document.head:any).getAttribute('data-inboxsdk-btai-header');
    if (existingHeader) {
      return existingHeader;
    } else {
      await this.ajaxInterceptStream
        .filter(({type}) => type === 'btaiHeaderReceived')
        .take(1)
        .toPromise();

      const newHeader = (document.head:any).getAttribute('data-inboxsdk-btai-header');
      if (!newHeader) throw new Error("Failed to look up BTAI header");
      return newHeader;
    }
  }

  getDraftIDForComposeView(el: HTMLElement): string {
    const draftIDFound = el.hasAttribute('data-inboxsdk-draft-id');

    if (!draftIDFound) {
      el.dispatchEvent(new CustomEvent('inboxSDKgetDraftIDforComposeView', {
        bubbles: true,
        cancelable: false,
        detail: null
      }));
    }

    const draftID = el.getAttribute('data-inboxsdk-draft-id');
    if (!draftID) throw new Error('could not find draft ID');

    return draftID;
  }
  notifyEmailSending(): void {
    document.dispatchEvent(new CustomEvent('inboxSDKcomposeViewIsSending', {
      bubbles: false,
      cancelable: false,
      detail: null
    }));
  }
  notifyEmailSendCanceled(): void {
    document.dispatchEvent(new CustomEvent('inboxSDKcomposeViewSendCanceled', {
      bubbles: false,
      cancelable: false,
      detail: null
    }));
  }
  registerAllowedHashLinkStartTerm(term: string) {
    document.dispatchEvent(new CustomEvent('inboxSDKregisterAllowedHashLinkStartTerm', {
      bubbles: false,
      cancelable: false,
      detail: {term}
    }));
  }

  clickAndGetNewIframeSrc(el: HTMLElement): Promise<string> {
    const pr = Kefir.fromEvents(el, 'inboxSDKclickAndGetNewIframeSrcResult')
      .take(1)
      .flatMap(({detail}) =>
        detail.type === 'success' ?
          Kefir.constant(detail.src) :
          Kefir.constantError(Object.assign(new Error(detail.message), {stack: detail.stack}))
      )
      .toPromise();

    el.dispatchEvent(new CustomEvent('inboxSDKclickAndGetNewIframeSrc', {
      bubbles: true,
      cancelable: false,
      detail: null
    }));
    return pr;
  }

  fakeWindowResize() {
    document.dispatchEvent(new CustomEvent('inboxSDKinboxFakeWindowResize', {
      bubbles: false,
      cancelable: false,
      detail: null
    }));
  }
}
