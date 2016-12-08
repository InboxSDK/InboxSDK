/* @flow */

import Kefir from 'kefir';
import CommonPageCommunicator from '../../lib/common-page-communicator';

export default class InboxPageCommunicator extends CommonPageCommunicator {
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
