import last from 'lodash/last';
import * as Kefir from 'kefir';

import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';

import _GmailElementGetter from '../gmail-element-getter';

export default function getMainContentElementChangedStream(
  GmailElementGetter: typeof _GmailElementGetter
): Kefir.Observable<HTMLElement, never> {
  const s = waitForMainContentContainer(GmailElementGetter)
    .flatMap((mainContentContainer) =>
      makeElementChildStream(mainContentContainer)
        .filter(({ el }) => el.classList.contains('nH'))
        .flatMap(({ el, removalStream }) =>
          makeMutationObserverChunkedStream(el, {
            attributes: true,
            attributeFilter: ['style'],
          })
            .map((x) => last(x)!)
            .toProperty(() => {
              return { target: el };
            })
            .filter(_isNowVisible)
            .map((e) => e.target)
            .takeUntilBy(removalStream)
        )
    )
    .toProperty();

  // Make sure we always have a subscriber. The function breaks if it loses all
  // subscribers and then re-gains some.
  s.onValue(() => {
    // ignore, just activate
  });

  return s as Kefir.Observable<HTMLElement, never>;
}

function waitForMainContentContainer(
  GmailElementGetter: typeof _GmailElementGetter
) {
  if (GmailElementGetter.isStandaloneComposeWindow()) {
    return Kefir.never();
  }
  return streamWaitFor(() => GmailElementGetter.getMainContentContainer());
}

function _isNowVisible(mutation: { target: HTMLElement } | MutationRecord) {
  const el = mutation.target as HTMLElement;
  return el.style.display !== 'none';
}
