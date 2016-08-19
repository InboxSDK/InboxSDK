/* @flow */

import Kefir from 'kefir';
import CommonPageCommunicator from '../../lib/common-page-communicator';

export default class InboxPageCommunicator extends CommonPageCommunicator {
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
}
