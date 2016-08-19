/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type InboxDriver from './inbox-driver';
import InboxMessageView from './views/inbox-message-view';
import censorHTMLtree from '../../../common/censor-html-tree';

import parser from './detection/message/parser';

export default function getThreadViewStream(driver: InboxDriver, messageElPool: *) {
  return messageElPool.items()
    .filter(({parsed}) => !parsed.attributes.isDraft)
    .flatMap(({el, removalStream, parsed}) => {
      // If the InboxMessageView is destroyed before the removalStream fires,
      // then make a new InboxMessageView out of the same element. Inbox re-uses
      // elements for different messages in some cases.
      return Kefir.repeat(i => {
        if (i !== 0) {
          parsed = parser(el);
          if (parsed.errors.length > 0) {
            driver.getLogger().errorSite(new Error(`message reparse errors`), {
              score: parsed.score,
              errors: parsed.errors,
              html: censorHTMLtree(el)
            });
          }
        }
        const view = new InboxMessageView(el, driver, parsed);
        removalStream.take(1).takeUntilBy(view.getStopper()).onValue(() => {
          view.destroy();
        });
        return Kefir.constant(view).ignoreEnd().takeUntilBy(view.getStopper());
        // Keep the stream open until the view is destroyed so the Kefir.repeat
        // callback doesn't re-run until then.
      }).takeUntilBy(removalStream);
    });
}
