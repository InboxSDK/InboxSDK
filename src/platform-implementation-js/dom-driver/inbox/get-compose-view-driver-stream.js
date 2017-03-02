/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type {TagTree} from 'tag-tree';
import censorHTMLtree from '../../../common/censor-html-tree';
import InboxComposeView from './views/inbox-compose-view';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import makeElementStreamMerger from '../../lib/dom/make-element-stream-merger';
import type InboxDriver from './inbox-driver';

import parser from './detection/compose/parser';

export default function getComposeViewDriverStream(driver: InboxDriver, tree: TagTree<HTMLElement>): Kefir.Observable<InboxComposeView> {
  const denodeify = ({el, removalStream}) => ({el: el.getValue(), removalStream});

  const inlineCompose = toItemWithLifetimeStream(tree.getAllByTag('inlineCompose')).map(denodeify);
  const regularCompose = toItemWithLifetimeStream(tree.getAllByTag('regularCompose')).map(denodeify);
  const fullscreenCompose = toItemWithLifetimeStream(tree.getAllByTag('fullscreenCompose')).map(denodeify);

  const compose = Kefir.merge([
    inlineCompose,
    regularCompose.merge(fullscreenCompose).flatMap(makeElementStreamMerger())
  ]);

  return compose.map(({el, removalStream}) => {
    const parsed = parser(el);
    if (parsed.errors.length) {
      this._logger.errorSite(new Error('parse errors (compose)'), {
        score: parsed.score,
        errors: parsed.errors,
        html: censorHTMLtree(el)
      });
    }
    const view = new InboxComposeView(driver, el, parsed);
    removalStream.take(1).onValue(() => view.destroy());
    return view;
  });
}
