/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import delayAsap from '../../../../lib/delay-asap';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import cssSelectorEscape from '../../../../lib/css-selector-escape';
import streamWaitFor from '../../../../lib/stream-wait-for';
import type GmailComposeView from '../gmail-compose-view';

var getSizeFixerSheet: () => CSSStyleSheet = _.once(() => {
  var style: HTMLStyleElement = (document.createElement('style'):any);
  style.type = 'text/css';
  style.className = 'inboxsdk__compose_size_fixer';
  document.head.appendChild(style);
  var sheet = style.sheet;
  if (!(sheet instanceof CSSStyleSheet)) {
    throw new Error("Could not add stylesheet");
  }
  return sheet;
});

// Gets a css selector string for a given id
function byId(id: string): string {
  return '#'+cssSelectorEscape(id);
}

export default function sizeFixer(driver: Object, gmailComposeView: GmailComposeView) {
  if (gmailComposeView.isInlineReplyForm() || gmailComposeView.getElement().classList.contains('inboxsdk__size_fixer')) {
    return;
  }
  gmailComposeView.getElement().classList.add('inboxsdk__size_fixer');

  const composeEvents = gmailComposeView.getEventStream();
  const stopper = composeEvents.ignoreValues().beforeEnd(() => null).toProperty();

  streamWaitFor(() => gmailComposeView.getScrollBody())
    .takeUntilBy(stopper)
    .onValue(scrollBody => {
      const resizeEvents = composeEvents
        .filter(e => _.includes(['resize', 'fullscreenChanged'], e.eventName))
        .merge(delayAsap(null));

      const statusAreaParent: HTMLElement = (gmailComposeView.getStatusArea().parentElement:any);

      const sheet = getSizeFixerSheet();
      const topForm = gmailComposeView.getTopFormElement();
      let composeId = gmailComposeView.getElement().id;
      if (!composeId) {
        composeId = gmailComposeView.getElement().id = `x${Math.random()}x${Date.now()}`;
      }

      function setRuleForSelector(selector: string, rule: string) {
        const fullSelector = byId(composeId)+' '+selector;
        const ix = _.findIndex(sheet.cssRules, cssRule => cssRule.selectorText === fullSelector);
        if (ix !== -1) {
          sheet.deleteRule(ix);
        }
        sheet.insertRule(fullSelector+' { '+rule+' }', 0);
      }

      // Emit resize events when the recipients area is toggled
      makeMutationObserverChunkedStream(statusAreaParent, {attributes:true})
        .takeUntilBy(stopper)
        .onValue(() => {
          gmailComposeView.getElement().dispatchEvent(new CustomEvent('resize', {
            bubbles: false, cancelable: false, detail: null
          }));
        });

      resizeEvents
        .bufferBy(resizeEvents.flatMap(x => delayAsap(null)))
        .filter(x => x.length > 0)
        .merge(
          makeMutationObserverChunkedStream(scrollBody, {attributes:true})
        )
        .takeUntilBy(stopper)
        .onValue(() => {
          const statusUnexpectedHeight = Math.max(statusAreaParent.offsetHeight - 42, 0);
          const topFormUnexpectedHeight = Math.max(topForm.offsetHeight - 84, 0);
          const unexpectedHeight = statusUnexpectedHeight+topFormUnexpectedHeight;

          setRuleForSelector(byId(scrollBody.id), `
max-height: ${parseInt(scrollBody.style.maxHeight, 10)-unexpectedHeight}px !important;
min-height: ${parseInt(scrollBody.style.minHeight, 10)-unexpectedHeight}px !important;
height: ${parseInt(scrollBody.style.height, 10)-unexpectedHeight}px !important;
`);
        });

      stopper.onValue(() => {
        // Go through the rules array backwards so that we remove them in backwards
        // order. If we went through in ascending order, we'd have to worry about
        // the list shrinking out from under us.
        for (let ix=sheet.cssRules.length-1; ix>=0; ix--) {
          if (_.startsWith((sheet.cssRules:any)[ix].selectorText, byId(composeId)+' ')) {
            sheet.deleteRule(ix);
          }
        }
      });
    });
}
