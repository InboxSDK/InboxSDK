/* @flow */

import Kefir from 'kefir';
import type {TagTree} from 'tag-tree';
import LiveSet from 'live-set';
import censorHTMLtree from '../../../common/censor-html-tree';
import InboxComposeView from './views/inbox-compose-view';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import makeElementStreamMerger from '../../lib/dom/make-element-stream-merger';
import type InboxDriver from './inbox-driver';

import parser from './detection/compose/parser';

export default function getComposeViewDriverLiveSet(driver: InboxDriver, tree: TagTree<HTMLElement>): LiveSet<InboxComposeView> {
  const denodeify = ({el, removalStream}) => ({el: el.getValue(), removalStream});

  const inlineCompose = toItemWithLifetimeStream(tree.getAllByTag('inlineCompose')).map(denodeify);
  const regularCompose = toItemWithLifetimeStream(tree.getAllByTag('regularCompose')).map(denodeify);
  const fullscreenCompose = toItemWithLifetimeStream(tree.getAllByTag('fullscreenCompose')).map(denodeify);

  const compose = Kefir.merge([
    inlineCompose,
    regularCompose.merge(fullscreenCompose).flatMap(makeElementStreamMerger())
  ]);

  const composeViewDriverStream: Kefir.Observable<InboxComposeView> = compose.map(({el, removalStream}) => {
    const parsed = parser(el);
    if (parsed.errors.length) {
      driver.getLogger().errorSite(new Error('parse errors (compose)'), {
        score: parsed.score,
        errors: parsed.errors,
        html: censorHTMLtree(el)
      });
    }
    const view = new InboxComposeView(driver, el, parsed);
    removalStream.take(1).onValue(() => view.removedFromDOM());
    return view;
  });

  return new LiveSet({
    scheduler: tree.getAllByTag('inlineCompose').getScheduler(),
    read() {
      return new Set();
    },
    listen(setValues, controller) {
      setValues(new Set());
      const sub = composeViewDriverStream.observe({
        value(composeViewDriver) {
          controller.add(composeViewDriver);
          composeViewDriver.getStopper().onValue(() => {
            controller.remove(composeViewDriver);
          });
        },
        error(err) {
          // If we get here, it's probably because of a waitFor timeout caused by
          // us failing to find the compose parent. Let's log the results of a few
          // similar selectors to see if our selector was maybe slightly wrong.
          function getStatus() {
            return {
              mainLength: document.querySelectorAll('[role=main]').length,
              regularLength: document.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]').length,
              noJsActionLength: document.querySelectorAll('body > div[id] > div[id][class]:not([role]) > div[class] > div[id]').length,
              noNotLength: document.querySelectorAll('body > div[id][jsaction] > div[id][class] > div[class] > div[id]').length,
              noBodyDirectChildLength: document.querySelectorAll('body div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]').length,
              noBodyLength: document.querySelectorAll('div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]').length,
              // We can use class names for logging heuristics. Don't want to use
              // them anywhere else.
              classLength: document.querySelectorAll('div.ek div.md > div').length,
              classEkLength: document.querySelectorAll('.ek').length,
              classMdLength: document.querySelectorAll('.md').length,
              composeHtml: Array.from(document.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id], div.ek div.md > div')).map(el => censorHTMLtree(el))
            };
          }

          const startStatus = getStatus();
          const waitTime = 180*1000;
          driver.getLogger().error(err, startStatus);
          setTimeout(() => {
            const laterStatus = getStatus();
            driver.getLogger().eventSdkPassive('waitfor compose data', {
              startStatus, waitTime, laterStatus
            });
          }, waitTime);
        }
      });
      return () => {
        sub.unsubscribe();
      };
    }
  });
}
