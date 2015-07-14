/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import kefirDelayAsap from '../../../../lib/kefir-delay-asap';
import kefirMakeMutationObserverChunkedStream from '../../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
//import Logger from '../../../../lib/logger';
import type GmailComposeView from '../gmail-compose-view';

export default function sizeFixer(gmailComposeView: GmailComposeView) {
  var composeEvents = kefirCast(Kefir, gmailComposeView.getEventStream());
  var resizeEvents = composeEvents
    .filter(e => _.includes(['resize', 'composeFullscreenStateChanged'], e.eventName))
    .merge(kefirDelayAsap(null));

  var statusArea = gmailComposeView.getStatusArea();
  var scrollBody = gmailComposeView.getScrollBody();
  var scrollBodyChild: HTMLElement = (scrollBody.firstElementChild: any);
  resizeEvents
    .bufferBy(resizeEvents.flatMap(x => kefirDelayAsap(null)))
    .filter(x => x.length > 0)
    .merge(
      // When Gmail sizes things, it sets the size of the scrollBody and its
      // child. We want to know when Gmail updates things, but we don't want
      // to detect our own changes. We don't touch the child, so we watch it.
      kefirMakeMutationObserverChunkedStream(scrollBodyChild, {attributes:true})
    )
    .takeUntilBy(composeEvents.filter(() => false).beforeEnd(() => null))
    .onValue(() => {
      if (gmailComposeView.getIsFullscreen()) {
        var statusHeight = statusArea.offsetHeight;
        var statusUnexpectedHeight = Math.max(statusHeight - 42, 0);
        var gmailScrollBodyHeight = parseInt(scrollBodyChild.style.maxHeight, 10);
        var newScrollHeight = `${gmailScrollBodyHeight-statusUnexpectedHeight}px`;
        Object.assign(scrollBody.style, {
          maxHeight: newScrollHeight,
          height: newScrollHeight,
          minHeight: newScrollHeight
        });
      }
    });
}
