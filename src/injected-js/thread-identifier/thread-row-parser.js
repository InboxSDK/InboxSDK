var _ = require('lodash');
var assert = require('assert');
var cleanupPeopleLine = require('./cleanup-people-line');

function extractMetadataFromThreadRow(threadRow) {
  var threadMetadata = {};

  var timeSpan, subjectSpan, peopleDiv;

  var threadRowIsVertical = _.intersection(_.toArray(threadRow.classList), ['zA','apv']).length === 2;
  if (threadRowIsVertical) {
    var threadRow2 = threadRow.nextSibling;
    var threadRow3 = threadRow2.nextSibling;
    assert(threadRow3.classList.contains('apw'), 'check 3rd row is last in group');

    timeSpan = threadRow.querySelector("td.apt > div.apm > span[title]");
    subjectSpan = threadRow2.querySelector("td div.xS div.xT div.y6 > span");
    peopleDiv = threadRow.querySelector("td.apy > div.yW");
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

  if (timeSpan) {
    threadMetadata.timeString = timeSpan.getAttribute('title');
  }
  if (subjectSpan) {
    threadMetadata.subject = subjectSpan.textContent;
  }
  if (peopleDiv) {
    threadMetadata.peopleHtml = cleanupPeopleLine(peopleDiv.innerHTML);
  }

  return threadMetadata;
}
exports.extractMetadataFromThreadRow = extractMetadataFromThreadRow;
