/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import googleLimitedAjax from './googleLimitedAjax';
import type {AjaxOpts, AjaxResponse} from '../../common/ajax';
import imageRequest from '../lib/imageRequest';

const IMAGE_REQUEST_TIMEOUT = 1000*60; // one minute

// Tool for making ajax requests to Gmail endpoints. When used in Inbox, this
// function is able to handle the issue that happens when the user has no Gmail
// cookies.
async function gmailAjax(opts: AjaxOpts): Promise<AjaxResponse> {
  if (!/^https:\/\/mail\.google\.com(?:$|\/)/.test(opts.url)) {
    throw new Error('Should not happen: gmailAjax called with non-gmail url');
  }

  if (document.location.origin === 'https://mail.google.com') {
    return await googleLimitedAjax(opts);
  }

  try {
    return await googleLimitedAjax({...opts, canRetry: false});
  } catch (e) {
    if (e && e.status === 0) {
      // The connection failed for an unspecified reason. One possible reason
      // is that we have no Gmail cookies, and the connection tried to redirect
      // to an accounts.google.com URL so the Gmail cookies could be set, but
      // then this connection failed because we don't have ajax permission to
      // accounts.google.com. We can work around this by trying an image
      // request (which doesn't have cross-domain restrictions) so the Gmail
      // cookies get set, and then retrying the original ajax request.
      try {
        await Kefir.fromPromise(imageRequest('https://mail.google.com/mail/u/0/'))
          .merge(Kefir.later(IMAGE_REQUEST_TIMEOUT))
          .take(1)
          .takeErrors(1)
          .toPromise();
      } catch (e) {
        // ignore. If we got an error here, there are several possible causes:
        // 1. The user has Gmail cookies, but the first connection attempt
        //    failed for another reason. In this case, we don't care about how
        //    this image request turned out.
        // 2. The user did not have Gmail cookies, and the image's original
        //    request and its first few redirects succeeded, setting the
        //    cookies, but the final request, after the cookies were set,
        //    failed. We don't care about the image's final request.
        // 3. The user did not have Gmail cookies, and the image request didn't
        //    work at all.
        // In the final case, ideally we would retry the image request, but we
        // can't distinguish that case from the other cases and doing retries
        // of the image request would slow down the other cases. The first case
        // is expected to be significantly more common -- the second two cases
        // where the user has no Gmail cookies is expected to happen maybe once
        // in total to an individual user.
      }
      return await googleLimitedAjax(opts);
    } else if (e && typeof e.status === 'number' && e.status >= 500) {
      return await googleLimitedAjax(opts);
    } else {
      throw e;
    }
  }
}

export default defn(module, gmailAjax);
