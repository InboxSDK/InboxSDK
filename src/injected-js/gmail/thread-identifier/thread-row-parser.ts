import intersection from 'lodash/intersection';
import assert from 'assert';
import * as logger from '../../injected-logger';
import { cleanupPeopleLine } from '../../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';

export type ThreadRowMetadata = {
  timeString: string;
  subject: string;
  peopleHtml: string;
};

/**
 * Ads in the Promotions tab aren't included with other thread row data.
 */
export const ThreadRowAd = Symbol(`ThreadRowAd`);

export function extractMetadataFromThreadRow(
  threadRow: HTMLElement
): ThreadRowMetadata | typeof ThreadRowAd {
  var timeSpan, subjectSpan, peopleDiv;
  assert(threadRow.hasAttribute('id'), 'check element is main thread row');
  var errors = [];
  const threadRowClasses = Array.from(threadRow.classList);
  var threadRowIsVertical =
    intersection(threadRowClasses, ['zA', 'apv']).length === 2;
  const isThreadRowAd =
    intersection(threadRowClasses, ['zA', 'zE']).length === 2;

  if (isThreadRowAd) {
    return ThreadRowAd;
  } else if (threadRowIsVertical) {
    var threadRow2 = threadRow.nextElementSibling;

    if (!threadRow2) {
      errors.push('failed to find threadRow2');
    } else {
      var threadRow3 = threadRow2.nextElementSibling;

      if (!threadRow3 || !threadRow3.classList.contains('apw')) {
        threadRow3 = null;
      }

      timeSpan = threadRow.querySelector('td.apt > div.apm > span[title]');
      subjectSpan = threadRow2.querySelector('td div.xS div.xT div.y6 > span');
      peopleDiv = threadRow.querySelector('td.apy > div.yW, td.apx > div.yW');
    }
  } else {
    timeSpan = threadRow.querySelector('td.xW > span[title]');
    var subjectAreaDiv = threadRow.querySelector(
      'td.a4W div[role=link] div.y6'
    );

    if (subjectAreaDiv && subjectAreaDiv.children.length >= 1) {
      subjectSpan = subjectAreaDiv.children[0]; // body snippet is not always present.
      //var bodySnippetSpan = subjectAreaDiv.children[1];
    }

    peopleDiv = threadRow.querySelector('td.yX > div.yW');
  }

  if (!timeSpan) {
    errors.push('failed to find timeSpan');
  }

  if (!subjectSpan) {
    errors.push('failed to find subjectSpan');
  }

  if (!peopleDiv) {
    errors.push('failed to find peopleDiv');
  }

  if (errors.length) {
    logger.error(new Error('Errors in thread row parsing'), {
      errors,
    });
  }

  return {
    timeString: timeSpan ? timeSpan.getAttribute('title') || '' : '',
    subject: subjectSpan ? subjectSpan.textContent! : '',
    peopleHtml: peopleDiv ? cleanupPeopleLine(peopleDiv.innerHTML) : '',
  };
}
