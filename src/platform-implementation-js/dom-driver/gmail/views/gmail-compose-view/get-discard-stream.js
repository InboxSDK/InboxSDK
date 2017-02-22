/* @flow */

import Kefir from 'kefir';
import fromEventTargetCapture from '../../../../lib/from-event-target-capture';

import type GmailComposeView from '../gmail-compose-view';

export default function(gmailComposeView: GmailComposeView): Kefir.Observable<Object> {

  const element = gmailComposeView.getElement();
  const discardButton = gmailComposeView.getDiscardButton();

  const domEventStream = Kefir.merge([
    fromEventTargetCapture(element, 'keydown')
      .filter(domEvent => (
        [13, 32].indexOf(domEvent.which) > -1 ||
        [13, 32].indexOf(domEvent.keyCode) > -1
      ))
      .filter(domEvent => (
        discardButton && discardButton.contains(domEvent.srcElement)
      )),

    fromEventTargetCapture(element, 'click').filter(domEvent => (
      discardButton && discardButton.contains(domEvent.srcElement)
    ))
  ]);

  return domEventStream.map(domEvent => ({eventName: 'discard'}));
}
