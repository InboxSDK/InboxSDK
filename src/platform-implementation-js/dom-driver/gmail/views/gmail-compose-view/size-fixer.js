/* @flow */

import includes from 'lodash/includes';
import startsWith from 'lodash/startsWith';
import findIndex from 'lodash/findIndex';
import once from 'lodash/once';
import Kefir from 'kefir';
import delayAsap from '../../../../lib/delay-asap';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import cssSelectorEscape from '../../../../lib/css-selector-escape';
import type GmailComposeView from '../gmail-compose-view';

const MATERIAL_UI_GMAIL_STATUS_HEIGHT = 60;
const MATERIAL_UI_TOP_FORM_HEIGHT = 72;

const SELECTOR_ESCAPE_HATCH_PREFIX =
  'body:not(.inboxsdk_hack_disableComposeSizeFixer) ';

var getSizeFixerSheet: () => CSSStyleSheet = once(() => {
  const style: HTMLStyleElement = (document.createElement('style'): any);
  style.type = 'text/css';
  style.className = 'inboxsdk__compose_size_fixer';
  (document.head: any).appendChild(style);
  var sheet = style.sheet;
  if (!(sheet instanceof CSSStyleSheet)) {
    throw new Error('Could not add stylesheet');
  }
  return sheet;
});

// Gets a css selector string for a given id
function byId(id: string): string {
  return '#' + cssSelectorEscape(id);
}

function getAdjustedHeightRules(scrollBody, unexpectedHeight, minimumHeight) {
  return ['height', 'min-height', 'max-height']
    .map((property) => {
      const currentValue = parseInt(
        scrollBody.style.getPropertyValue(property),
        10
      );

      if (Number.isNaN(currentValue)) {
        return null;
      }

      // The child message body textbox enforces a minimum height, so ensure the
      // adjusted minimum height of the scroll body doesn't fall below it.
      const adjustedValue = Math.max(
        currentValue - unexpectedHeight,
        minimumHeight
      );

      if (adjustedValue === currentValue) {
        return null;
      }

      return `${property}: ${adjustedValue}px !important;`;
    })
    .filter(Boolean)
    .join('\n');
}

function getMinimumBodyHeight(gmailComposeView) {
  const bodyElement = gmailComposeView.getMaybeBodyElement();

  if (!bodyElement) {
    return 0;
  }

  return parseInt(bodyElement.style.minHeight, 10) || 0;
}

export default function sizeFixer(
  driver: Object,
  gmailComposeView: GmailComposeView
) {
  if (
    gmailComposeView.isInlineReplyForm() ||
    gmailComposeView.getElement().classList.contains('inboxsdk__size_fixer')
  ) {
    return;
  }
  gmailComposeView.getElement().classList.add('inboxsdk__size_fixer');

  var composeEvents = gmailComposeView.getEventStream();
  var stopper = composeEvents.filter(() => false).beforeEnd(() => null);
  var resizeEvents = composeEvents
    .filter((e) => includes(['resize', 'fullscreenChanged'], e.eventName))
    .merge(delayAsap(null));

  var statusAreaParent: HTMLElement = (gmailComposeView.getStatusArea()
    .parentElement: any);
  var scrollBody: HTMLElement = gmailComposeView.getScrollBody();

  var sheet = getSizeFixerSheet();
  var topForm = gmailComposeView.getTopFormElement();
  var composeId = gmailComposeView.getElement().id;
  if (!composeId) {
    composeId =
      gmailComposeView.getElement().id = `x${Math.random()}x${Date.now()}`;
  }

  function setRuleForSelector(selector: string, rule: string) {
    const fullSelector =
      SELECTOR_ESCAPE_HATCH_PREFIX + byId(composeId) + ' ' + selector;
    const ix = findIndex(
      sheet.cssRules,
      (cssRule) => cssRule.selectorText === fullSelector
    );
    if (ix !== -1) {
      sheet.deleteRule(ix);
    }
    sheet.insertRule(fullSelector + ' { ' + rule + ' }', 0);
  }

  // Emit resize events when the recipients area is toggled
  makeMutationObserverChunkedStream(statusAreaParent, { attributes: true })
    .takeUntilBy(stopper)
    .onValue(() => {
      gmailComposeView.getElement().dispatchEvent(
        new CustomEvent('resize', {
          bubbles: false,
          cancelable: false,
          detail: null,
        })
      );
    });

  resizeEvents
    .bufferBy(resizeEvents.flatMap((x) => delayAsap(null)))
    .filter((x) => x.length > 0)
    .merge(makeMutationObserverChunkedStream(scrollBody, { attributes: true }))
    .takeUntilBy(stopper)
    .onValue(() => {
      const statusUnexpectedHeight = Math.max(
        statusAreaParent.offsetHeight - MATERIAL_UI_GMAIL_STATUS_HEIGHT,
        0
      );

      const topFormUnexpectedHeight = Math.max(
        topForm.offsetHeight - MATERIAL_UI_TOP_FORM_HEIGHT,
        0
      );

      const unexpectedHeight = statusUnexpectedHeight + topFormUnexpectedHeight;
      const minimumHeight = getMinimumBodyHeight(gmailComposeView);

      const adjustedHeightRules = getAdjustedHeightRules(
        scrollBody,
        unexpectedHeight,
        minimumHeight
      );

      setRuleForSelector(byId(scrollBody.id), adjustedHeightRules);
    });

  stopper.onValue(() => {
    // Go through the rules array backwards so that we remove them in backwards
    // order. If we went through in ascending order, we'd have to worry about
    // the list shrinking out from under us.
    for (let ix = sheet.cssRules.length - 1; ix >= 0; ix--) {
      if (
        startsWith(
          (sheet.cssRules: any)[ix].selectorText,
          SELECTOR_ESCAPE_HATCH_PREFIX + byId(composeId) + ' '
        )
      ) {
        sheet.deleteRule(ix);
      }
    }
  });
}
