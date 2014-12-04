function extractMetadataFromThreadRow(threadRow) {
  // if(threadRow.type === 'vertical'){
  //   return this._extractMetadataFromVerticalPreviewPaneRow(threadRow);
  // }

  var threadMetadata = {};

  var timeSpan = threadRow.querySelector("td:last-child > span");

  if (timeSpan) {
    threadMetadata.timeString = timeSpan.getAttribute('title');
  }

  var subjectAreaDiv = threadRow.querySelector("td.a4W div[role=link] div.y6");
  if (subjectAreaDiv && subjectAreaDiv.children.length >= 2) {
    var subjectSpan = subjectAreaDiv.children[0];
    var bodySnippetSpan = subjectAreaDiv.children[1];

    threadMetadata.subject = subjectSpan.textContent;
  }

  var peopleDiv = threadRow.querySelector("td.yX > div.yW");
  if (peopleDiv) {
    threadMetadata.peopleHtml = peopleDiv.innerHTML;
  }

  return threadMetadata;
}
exports.extractMetadataFromThreadRow = extractMetadataFromThreadRow;

// function extractMetadataFromVerticalPreviewPaneRow(threadRow) {
//   var threadMetadata = {};
//   var rowSet = threadRow.node;
//
//   if(!rowSet || rowSet.length < 2){
//     return threadMetadata;
//   }
//
//   if (rowSet[0].find('td.apt .apm span').length > 0) {
//     threadMetadata.timeString = rowSet[0].find('td.apt .apm span').attr('title');
//     threadMetadata.date = $.cleanString(rowSet[0].find('td.apt .apm span')[0].innerHTML);
//   }
//
//   var subjectSpan = rowSet[1].find('td[role=link] span[id]');
//   threadMetadata.subject = subjectSpan[0].textContent.stripNonPrintableCharacters();
//   threadMetadata.isUnread = subjectSpan[0].innerHTML.indexOf('<b>') > -1;
//
//   if (rowSet.length < 3) {
//     threadMetadata.bodyString = '';
//   } else if (rowSet[2].find('.y2').length > 0) {
//     threadMetadata.bodyString = $.cleanText(rowSet[2].find('.y2').cleanText());
//   }
//
//   threadMetadata.names = [];
//   threadMetadata.emailAddresses = [];
//   threadMetadata.emailString = '';
//
//   rowSet[0].find('span[email]').each(function(i, span) {
//     threadMetadata.names.push($(span)[0].innerHTML);
//     threadMetadata.emailAddresses.push($(span).attr('email'));
//   });
//   if (threadMetadata.emailAddresses.length > 0) {
//     threadMetadata.emailString = rowSet[0].find('span[email]').closest('div')[0].innerHTML.replace(/zF|yP/, '');
//   }
//
//   if(rowSet[0].find('[streakthreadid]').length > 0){
//     threadMetadata.threadGmailId = rowSet[0].find('[streakthreadid]').attr('streakthreadid');
//   }
//
//   return threadMetadata;
// }
