/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import censorHTMLtree from '../../../common/censor-html-tree';
import InboxAttachmentCardView from './views/inbox-attachment-card-view';
import type InboxDriver from './inbox-driver';

import finder from './detection/attachmentCard/finder';
import watcher from './detection/attachmentCard/watcher';
import parser from './detection/attachmentCard/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver, threadElStream, messageElStream): Kefir.Stream<InboxAttachmentCardView> {
  return detectionRunner({
    name: 'attachmentCard',
    finder,
    watcher: root => watcher(root, threadElStream, messageElStream),
    parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  })
    .map(({el, removalStream, parsed}) => {
      const view = new InboxAttachmentCardView({element: el, parsed}, driver);
      removalStream.take(1).onValue(() => view.destroy());
      return view;
    });
}

export default function getAttachmentCardViewDriverStream(driver: InboxDriver, threadElStream: Kefir.Stream<*>, messageElStream: Kefir.Stream<*>): Kefir.Stream<InboxAttachmentCardView> {
  return impStream.flatMapLatest(_imp => _imp(driver, threadElStream, messageElStream));
}
