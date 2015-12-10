/* @flow */
//jshint ignore:start

import {defn} from 'ud';
import Kefir from 'kefir';
import type GmailComposeView from '../views/gmail-compose-view';
import type GmailThreadRowView from '../views/gmail-thread-row-view';

// This object helps GmailThreadRowViews identify themselves if the normal
// method (ask the injected script) fails to work. This object keeps track of
// the open GmailComposeViews so it can
class ThreadRowIdentifierHelper {
  _composeViews: Set<GmailComposeView>;

  constructor(gmailComposeViewStream: Kefir.Stream<GmailComposeView>) {
    this._composeViews = new Set();

    gmailComposeViewStream.onValue(gmailComposeView => {
      this._composeViews.add(gmailComposeView);

      gmailComposeView.getStopper().onValue(() => {
        this._composeViews.delete(gmailComposeView);
      });
    });
  }

  findComposeForThreadRow(gmailThreadRowView: GmailThreadRowView): ?GmailComposeView {
    const subject = gmailThreadRowView.getSubject();
    for (let gmailComposeView of this._composeViews) {
      if (subject === gmailComposeView.getSubject()) {
        return gmailComposeView;
      }
    }
    return null;
  }
}

export default defn(module, ThreadRowIdentifierHelper);
