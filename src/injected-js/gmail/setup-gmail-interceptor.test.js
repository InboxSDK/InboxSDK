/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import MockServer from '../../../test/lib/MockServer';

jest.mock('../injected-logger', () => {
  return {
    error(err: Error, details?: any) {
      // eslint-disable-next-line no-console
      console.error(err, details);
      throw err;
    },
    eventSdkPassive(name: string, details?: any) {}
  };
});

import _ajax from '../../common/ajax';
import type { AjaxOpts, AjaxResponse } from '../../common/ajax';

function ajax(
  frame: { XMLHttpRequest: typeof XMLHttpRequest },
  opts: AjaxOpts
): Promise<AjaxResponse> {
  const orig_XMLHttpRequest = window.XMLHttpRequest;
  try {
    window.XMLHttpRequest = frame.XMLHttpRequest;
    return _ajax({ ...opts, canRetry: false });
  } finally {
    window.XMLHttpRequest = orig_XMLHttpRequest;
  }
}

const raw: Function = String.raw; // https://github.com/facebook/flow/issues/2616

import { setupGmailInterceptorOnFrames } from './setup-gmail-interceptor';

const mainServer = new MockServer();
const mainFrame = { XMLHttpRequest: mainServer.XMLHttpRequest };
const jsServer = new MockServer();
const jsFrame = { XMLHttpRequest: jsServer.XMLHttpRequest };

beforeAll(() => {
  setupGmailInterceptorOnFrames(mainFrame, jsFrame);
});

const ajaxInterceptEvents: Array<Object> = [];
Kefir.fromEvents(document, 'inboxSDKajaxIntercept').onValue(event => {
  ajaxInterceptEvents.push(event.detail);
});

afterEach(() => {
  ajaxInterceptEvents.length = 0;
});

describe('sync api', () => {
  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=32' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOnSend.json')
      )
    }
  );

  test('cv:on send', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=32',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"6","2":{"1":"thread-a:r8235801758805685576","2":{"14":{"1":{"1":"msg-a:r-3147389712012403088","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547859067835","8":"","9":{"2":[{"1":0,"2":"<div dir=\"ltr\"><br></div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"18":"1547859067835","42":0,"43":{"1":0,"2":0,"3":0,"4":0},"52":"s:512627d3fa03dd2f|#msg-a:r-3147389712012403088|0"},"3":1}}}}]},"4":{"2":1,"3":"1547859067853","4":1,"5":83},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOnSend.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      { type: 'emailSending', draftID: 'r-3147389712012403088' },
      {
        draftID: 'r-3147389712012403088',
        type: 'emailSent',
        threadID: 'thread-a:r8235801758805685576',
        messageID: 'msg-a:r-3147389712012403088'
      }
    ]);
  });

  xtest('cv:on send reply', async () => {});

  xtest('cv:off send', async () => {});

  xtest('cv:off send reply', async () => {});
});
