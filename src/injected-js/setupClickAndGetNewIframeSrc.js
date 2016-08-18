/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';
import simulateClick from '../platform-implementation-js/lib/dom/simulate-click';
import makeElementChildStream from '../platform-implementation-js/lib/dom/make-element-child-stream';

export default function setupClickAndGetNewIframeSrc() {
  makeElementChildStream(document.body)
    .filter(({el}) => el.nodeName === 'IFRAME' && !el.hasAttribute('src'))
    .onValue(({el}) => {
      const document = (el:any).contentDocument;
      document.addEventListener('inboxSDKclickAndGetNewIframeSrc', function(event: Object) {
        clickAndGetNewIframeSrc(event.target)
          .then(src => {
            event.target.dispatchEvent(new CustomEvent('inboxSDKclickAndGetNewIframeSrcResult', {
              bubbles: false,
              cancelable: false,
              detail: {type: 'success', src}
            }));
          })
          .catch(err => {
            event.target.dispatchEvent(new CustomEvent('inboxSDKclickAndGetNewIframeSrcResult', {
              bubbles: false,
              cancelable: false,
              detail: {type: 'error', message: err.message, stack: err.stack}
            }));
          });
      });
    });
}

const getIframeProto = once(() =>
  Object.getPrototypeOf(document.createElement('iframe'))
);

const getIframeSrcDescriptor = once(() =>
  Object.getOwnPropertyDescriptor(getIframeProto(), 'src')
);

const iframeSrcSets: Kefir.Stream<string> = Kefir.stream(emitter => {
  const iframeProto = getIframeProto();
  const originalDescriptor = getIframeSrcDescriptor();
  (Object:any).defineProperty(iframeProto, 'src', {
    enumerable: true,
    configurable: true,
    set(src) {
      emitter.emit(src);
    }
  });
  return () => {
    (Object:any).defineProperty(iframeProto, 'src', originalDescriptor);
  };
});

function clickAndGetNewIframeSrc(el: HTMLElement): Promise<string> {
  const pr = iframeSrcSets
    .merge(Kefir.later(10*1000, null))
    .take(1)
    .flatMap(result =>
      result ?
        Kefir.constant(result) :
        Kefir.constantError(new Error('timed out waiting for iframe src set'))
    )
    .toPromise();

  simulateClick(el);
  return pr;
}
