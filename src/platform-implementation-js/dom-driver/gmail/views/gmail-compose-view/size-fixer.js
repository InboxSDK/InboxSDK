/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import kefirDelayAsap from '../../../../lib/kefir-delay-asap';
import kefirMakeMutationObserverChunkedStream from '../../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
import cssSelectorEscape from '../../../../lib/css-selector-escape';
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
  var composeEvents = kefirCast(Kefir, gmailComposeView.getEventStream());
  var resizeEvents = composeEvents
    .filter(e => _.includes(['resize', 'composeFullscreenStateChanged'], e.eventName))
    .merge(kefirDelayAsap(null));

  var statusAreaParent: HTMLElement = (gmailComposeView.getStatusArea().parentElement:any);
  var scrollBody: HTMLElement = gmailComposeView.getScrollBody();

  var sheet = getSizeFixerSheet();
  var composeId = gmailComposeView.getElement().id;
  if (!composeId) {
    composeId = gmailComposeView.getElement().id = `x${Math.random()}x${Date.now()}`;
  }

  function setRuleForSelector(selector: string, rule: string) {
    var fullSelector = byId(composeId)+' '+selector;
    var ix = _.findIndex(sheet.cssRules, cssRule => cssRule.selectorText === fullSelector);
    if (ix !== -1) {
      sheet.deleteRule(ix);
    }
    sheet.insertRule(fullSelector+' { '+rule+' }', 0);
  }

  resizeEvents
    .bufferBy(resizeEvents.flatMap(x => kefirDelayAsap(null)))
    .filter(x => x.length > 0)
    .merge(
      kefirMakeMutationObserverChunkedStream(scrollBody, {attributes:true})
    )
    .takeUntilBy(composeEvents.filter(() => false).beforeEnd(() => null))
    .onValue(() => {
      var statusHeight = statusAreaParent.offsetHeight;
      var statusUnexpectedHeight = Math.max(statusHeight - 42, 0);
      var gmailScrollBodyHeight = parseInt(scrollBody.style.maxHeight, 10);
      var newScrollHeight = `${gmailScrollBodyHeight-statusUnexpectedHeight}px`;

      setRuleForSelector(byId(scrollBody.id), `
max-height: ${newScrollHeight} !important;
min-height: ${newScrollHeight} !important;
height: ${newScrollHeight} !important;
`);
    });

  composeEvents.onEnd(() => {
    // Go through the rules array backwards so that we remove them in backwards
    // order. If we went through in ascending order, we'd have to worry about
    // the list shrinking out from under us.
    for (var ix=sheet.cssRules.length-1; ix>=0; ix--) {
      if (_.startsWith((sheet.cssRules:any)[ix].selectorText, byId(composeId)+' ')) {
        sheet.deleteRule(ix);
      }
    }
  });
}
