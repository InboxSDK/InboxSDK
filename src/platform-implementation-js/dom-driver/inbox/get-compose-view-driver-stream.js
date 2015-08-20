/* @flow */
//jshint ignore:start

var Kefir = require('kefir');
import * as HMR from '../../../common/hmr-util';
import kefirWaitFor from '../../lib/kefir-wait-for';
import kefirDelayAsap from '../../lib/kefir-delay-asap';
import censorHTMLtree from '../../../common/censor-html-tree';
import kmakeElementChildStream from '../../lib/dom/kefir-make-element-child-stream';
import kefirElementViewMapper from '../../lib/dom/kefir-element-view-mapper';
import InboxComposeView from './views/inbox-compose-view';
import type InboxDriver from './inbox-driver';
import type {ComposeViewDriver} from '../../driver-interfaces/compose-view-driver';

var impStream = HMR.makeUpdatableStream(module, imp);

function imp(driver: InboxDriver): Kefir.Stream<ComposeViewDriver> {
  return kefirWaitFor(() => {
    var els = document.querySelectorAll('body > div[id][jsan] > div[id][class] > div[class] > div[id]:first-child');
    return els.length === 1 ? els[0] : null;
  })
    .flatMap(kmakeElementChildStream)
    .filter(({el}) => el.hasAttribute('jsnamespace') && el.hasAttribute('jstcache'))
    .flatMap(event =>
      // ignore the composes that get removed immediately
      kefirDelayAsap(event)
        .takeUntilBy(event.removalStream)
    )
    .map(kefirElementViewMapper((el: HTMLElement) => {
      var composeEl = el.querySelector('div[role=dialog]');
      if (!composeEl) {
        driver.getLogger().error(new Error("compose dialog element not found"), {
          html: censorHTMLtree(el)
        });
        return null;
      }
      return new InboxComposeView(driver, composeEl)
    }))
    .filter(Boolean);
}

export default function getComposeViewDriverStream(driver: InboxDriver): Kefir.Stream<ComposeViewDriver> {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
