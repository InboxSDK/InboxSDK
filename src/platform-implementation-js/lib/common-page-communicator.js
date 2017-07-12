/* @flow */

import once from 'lodash/once';
import asap from 'asap';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import Logger from './logger';
import type {AjaxOpts} from '../../common/ajax';

export default class CommonPageCommunicator {
  getUserEmailAddress(): string {
    const s = (document.head:any).getAttribute('data-inboxsdk-user-email-address');
    if (typeof s !== 'string') throw new Error('should not happen');
    return s;
  }

  getUserLanguage(): string {
    const s = (document.head:any).getAttribute('data-inboxsdk-user-language');
    if (typeof s !== 'string') throw new Error('should not happen');
    return s;
  }

  getIkValue(): string {
    const ownIk = (document.head:any).getAttribute('data-inboxsdk-ik-value');
    if (ownIk) {
      return ownIk;
    }
    // For standalone windows.
    if (window.opener) {
      return window.opener.document.head.getAttribute('data-inboxsdk-ik-value');
    }
    throw new Error("Failed to look up 'ik' value");
  }

  resolveUrlRedirects(url: string): Promise<string> {
    return this.pageAjax({url, method: 'HEAD'}).then(result => result.responseURL);
  }

  pageAjax(opts: AjaxOpts): Promise<{text: string, responseURL: string}> {
    var id = `${Date.now()}-${Math.random()}`;
    var promise = Kefir.fromEvents(document, 'inboxSDKpageAjaxDone')
      .filter(event => event.detail && event.detail.id === id)
      .take(1)
      .flatMap(event => {
        if (event.detail.error) {
          var err = Object.assign(
            (new Error(event.detail.message || "Connection error"): any),
            {status: event.detail.status}
          );
          if (event.detail.stack) {
            err.stack = event.detail.stack;
          }
          return Kefir.constantError(err);
        } else {
          return Kefir.constant({
            text: event.detail.text,
            responseURL: event.detail.responseURL
          });
        }
      })
      .toPromise(RSVP.Promise);

    document.dispatchEvent(new CustomEvent('inboxSDKpageAjax', {
      bubbles: false, cancelable: false,
      detail: Object.assign({}, opts, {id})
    }));

    return promise;
  }

  silenceGmailErrorsForAMoment(): ()=>void {
    document.dispatchEvent(new CustomEvent('inboxSDKsilencePageErrors', {
      bubbles: false, cancelable: false, detail: null
    }));
    // create error here for stacktrace
    var error = new Error("Forgot to unsilence page errors");
    var unsilenced = false;
    var unsilence = once(() => {
      unsilenced = true;
      document.dispatchEvent(new CustomEvent('inboxSDKunsilencePageErrors', {
        bubbles: false,
        cancelable: false,
        detail: null
      }));
    });
    asap(() => {
      if (!unsilenced) {
        Logger.error(error);
        unsilence();
      }
    });
    return unsilence;
  }
}
