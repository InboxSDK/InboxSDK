/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import censorHTMLtree from '../../../common/censor-html-tree';
import InboxAttachmentOverlayView from './views/inbox-attachment-overlay-view';
import type InboxDriver from './inbox-driver';

import finder from './detection/attachmentOverlay/finder';
import watcher from './detection/attachmentOverlay/watcher';
import parser from './detection/attachmentOverlay/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver): Kefir.Stream<InboxAttachmentOverlayView> {
  return detectionRunner({
    name: 'attachmentOverlay',
    finder, watcher, parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  })
    .flatMap(({el, removalStream, parsed}) => {
      const cardView = driver.getLastInteractedAttachmentCardView();
      if (cardView) {
        return Kefir.constant({
          el, removalStream, parsed, cardView
        });
      } else {
        driver.getLogger().errorSite(new Error('got attachmentOverlay element without a lastInteractedAttachmentCardView'), {
          attachmentOverlayHTML: censorHTMLtree(el)
        });
        return Kefir.never();
      }
    })
    .map(({el, removalStream, parsed, cardView}) => {
      const view = new InboxAttachmentOverlayView(driver, el, parsed, cardView);
      removalStream.take(1).onValue(() => view.destroy());
      return view;
    });
}

export default function getAttachmentOverlayViewStream(driver: InboxDriver): Kefir.Stream<InboxAttachmentOverlayView> {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
