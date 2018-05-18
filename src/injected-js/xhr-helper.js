/* @flow */

import ajax from '../common/ajax';

export default function xhrHelper() {
  document.addEventListener('inboxSDKpageAjax', function(event: any) {
    const id = event.detail.id;
    const opts = {
      url: event.detail.url,
      method: event.detail.method,
      headers: event.detail.headers,
      xhrFields: event.detail.xhrFields,
      data: event.detail.data
    };

    // It's important to use fetch when possible because it's needed for
    // getDownloadURL() in Gmail v2: Gmail v2's ServiceWorker in Chrome causes
    // xhr.responseURL to have the wrong value (possibly a Chrome bug).
    if (global.fetch) {
      (async () => {
        const response = await fetch(opts.url, {credentials: 'include'});
        document.dispatchEvent(new CustomEvent('inboxSDKpageAjaxDone', {
          bubbles: false, cancelable: false,
          detail: {
            id,
            error: false,
            text: await response.text(),
            responseURL: response.url
          }
        }));
      })().catch(err => {
        document.dispatchEvent(new CustomEvent('inboxSDKpageAjaxDone', {
          bubbles: false, cancelable: false,
          detail: {
            id,
            error: true,
            message: err && err.message,
            stack: err && err.stack,
            status: err && err.xhr && err.xhr.status
          }
        }));
      });
    } else {
      ajax(opts).then(({text, xhr}) => {
        document.dispatchEvent(new CustomEvent('inboxSDKpageAjaxDone', {
          bubbles: false, cancelable: false,
          detail: {
            id,
            error: false,
            text,
            responseURL: (xhr:any).responseURL
          }
        }));
      }, err => {
        document.dispatchEvent(new CustomEvent('inboxSDKpageAjaxDone', {
          bubbles: false, cancelable: false,
          detail: {
            id,
            error: true,
            message: err && err.message,
            stack: err && err.stack,
            status: err && err.xhr && err.xhr.status
          }
        }));
      });
    }
  });
}
