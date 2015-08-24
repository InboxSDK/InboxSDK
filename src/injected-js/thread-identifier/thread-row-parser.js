/* @flow */
//jshint ignore:start

import _ from 'lodash';
import assert from 'assert';
import * as logger from '../injected-logger';
import {cleanupPeopleLine} from '../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';

export type ThreadRowMetadata = {
  timeString: string;
  subject: string;
  peopleHtml: string;
};

export function extractMetadataFromThreadRow(threadRow: HTMLElement): ThreadRowMetadata {
  var timeSpan, subjectSpan, peopleDiv;

  assert(threadRow.hasAttribute('id'), 'check element is main thread row');

  var threadRowIsVertical = _.intersection(_.toArray(threadRow.classList), ['zA','apv']).length === 2;
  if (threadRowIsVertical) {
    var threadRow2 = threadRow.nextElementSibling;
    var threadRow3 = threadRow2.nextElementSibling;
    if (!threadRow3 || !threadRow3.classList.contains('apw')) {
      threadRow3 = null;
    }

    timeSpan = threadRow.querySelector("td.apt > div.apm > span[title]");
    subjectSpan = threadRow2.querySelector("td div.xS div.xT div.y6 > span");
    peopleDiv = threadRow.querySelector("td.apy > div.yW, td.apx > div.yW");
  } else {
    timeSpan = threadRow.querySelector("td.xW > span[title]");

    var subjectAreaDiv = threadRow.querySelector("td.a4W div[role=link] div.y6");
    if (subjectAreaDiv && subjectAreaDiv.children.length >= 1) {
      subjectSpan = subjectAreaDiv.children[0];

      // body snippet is not always present.
      //var bodySnippetSpan = subjectAreaDiv.children[1];
    }

    peopleDiv = threadRow.querySelector("td.yX > div.yW");
  }

  var errors = [];
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
    logger.error(new Error("Errors in thread row parsing"), {errors});
  }

  return {
    timeString: timeSpan.getAttribute('title') || '',
    subject: subjectSpan ? subjectSpan.textContent : '',
    peopleHtml: peopleDiv ? cleanupPeopleLine(peopleDiv.innerHTML) : ''
  };
}
