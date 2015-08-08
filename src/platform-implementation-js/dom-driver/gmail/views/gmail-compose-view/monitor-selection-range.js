/* @flow */
//jshint ignore:start

var Kefir = require('kefir');
import type GmailComposeView from '../gmail-compose-view';

export default function(gmailComposeView: GmailComposeView) {
  Kefir.merge([
    Kefir.fromEvents(document.body, 'mousedown'),
    Kefir.fromEvents(document.body, 'keydown')
  ]).takeUntilBy(gmailComposeView.getStopper())
  .onValue(event => {
    var body = gmailComposeView.getBodyElement();
    var selection = (document:any).getSelection();
    if (body && selection.rangeCount > 0 && body.contains(selection.anchorNode)) {
      gmailComposeView.setLastSelectionRange(selection.getRangeAt(0));
    }
  });
}
