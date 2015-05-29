const Bacon = require('baconjs');

export default function(gmailComposeView) {
  Bacon.mergeAll(
    Bacon.fromEventTarget(document.body, 'mousedown'),
    Bacon.fromEventTarget(document.body, 'keydown')
  ).takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd())
  .onValue(function(event) {
    const body = gmailComposeView.getBodyElement();
    const selection = document.getSelection();
    if (body && selection.rangeCount > 0 && body.contains(selection.anchorNode)) {
      gmailComposeView.setLastSelectionRange(selection.getRangeAt(0));
    }
  });
}
