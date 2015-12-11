/* @flow */
//jshint ignore:start

import {defn} from 'ud';
import Kefir from 'kefir';
import type GmailDriver from '../gmail-driver';
import type GmailComposeView from '../views/gmail-compose-view';
import type GmailThreadRowView from '../views/gmail-thread-row-view';

// This object helps GmailThreadRowViews identify themselves if the normal
// method (ask the injected script) fails to work. This object keeps track of
// the open GmailComposeViews so it can
class ThreadRowIdentifier {
  _driver: GmailDriver;
  _composeViews: Set<GmailComposeView>;

  constructor(driver: GmailDriver) {
    this._driver = driver;
    this._composeViews = new Set();

    this._driver.getComposeViewDriverStream().onValue((gmailComposeView: Object) => {
      this._composeViews.add(gmailComposeView);

      gmailComposeView.getStopper().onValue(() => {
        this._composeViews.delete(gmailComposeView);
      });
    });
  }

  getThreadIdForThreadRow(gmailThreadRowView: GmailThreadRowView, elements: HTMLElement[]): ?string {
    {
      const threadID = this._driver.getPageCommunicator().getThreadIdForThreadRowByDatabase(elements[0]);
      if (threadID) {
        return threadID;
      }
    }

    const minimizeStates = new Map();
    for (let composeView of this._composeViews) {
      minimizeStates.set(composeView, composeView.getMinimized());
    }

    {
      const threadID = this._driver.getPageCommunicator().getThreadIdForThreadRowByClick(elements[0]);
      if (threadID) {
        return threadID;
      }
    }

    for (let [composeView, minimized] of minimizeStates) {
      composeView.setMinimized(minimized);
    }

    if (
      gmailThreadRowView.getVisibleMessageCount() == 0 && gmailThreadRowView.getVisibleDraftCount() > 0
    ) {
      const composeView = this._findComposeForThreadRow(gmailThreadRowView);
      if (composeView) {
        return composeView.getMessageID();
      }
    }
    return null;
  }

  async getDraftIdForThreadRow(gmailThreadRowView: GmailThreadRowView): Promise<?string> {
    if (
      gmailThreadRowView.getVisibleMessageCount() > 0 ||
      gmailThreadRowView.getVisibleDraftCount() == 0
    ) {
      return null;
    }
    const composeView = this._findComposeForThreadRow(gmailThreadRowView);
    if (composeView) {
      return composeView.getDraftID();
    }
    return this._driver.getDraftIDForMessageID(gmailThreadRowView.getThreadID());
  }

  _findComposeForThreadRow(gmailThreadRowView: GmailThreadRowView): ?GmailComposeView {
    const subject = gmailThreadRowView.getSubject();
    for (let gmailComposeView of this._composeViews) {
      if (subject === gmailComposeView.getSubject()) {
        return gmailComposeView;
      }
    }
    return null;
  }
}

export default defn(module, ThreadRowIdentifier);
