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

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=80' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOnReplyDraftSave.json')
      )
    }
  );

  test('cv:on reply draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=80',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"2":{"1":[{"1":"13","2":{"1":"thread-a:r8235801758805685576","2":{"2":{"1":{"1":"msg-a:r-4742963983885267953","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547862932860","8":"Re: ","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 4:51 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\"><br></div>\n</blockquote></div>"}],"7":1},"11":["^all","^r","^r_bt","^io_im"],"16":"<CAL_Ays_f9YieNaOcMrYQG6XNLygC-bNexCHpYWfCjVdtts7=5Q@mail.gmail.com>","18":"1547862932860","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:512627d3fa03dd2f|#msg-a:r-4742963983885267953|0"},"2":"msg-a:r-3147389712012403088","3":1,"5":{"1":"1547862932865"}}}}}]},"3":{"1":1,"2":"21847650","5":{"2":0},"7":1},"4":{"2":1,"3":"1547862932867","4":0,"5":81},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOnReplyDraftSave.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r-4742963983885267953',
        messageID: 'msg-a:r-4742963983885267953',
        oldMessageID: '16863d1fe47a5415',
        oldThreadID: '168639635416079a',
        rfcID:
          '<CAL_Ays9L8FwQPteKmM4fj9J-4R76XMxAyxPmR7U=U1YwJ=4Zmw@mail.gmail.com>',
        threadID: 'thread-a:r8235801758805685576',
        type: 'emailDraftReceived'
      }
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=84' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOnReplySend.json')
      )
    }
  );

  test('cv:on send reply', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=84',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"15","2":{"1":"thread-a:r8235801758805685576","2":{"14":{"1":{"1":"msg-a:r-4742963983885267953","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547863370143","8":"Re: ","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 4:51 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\"><br></div>\n</blockquote></div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"16":"<CAL_Ays_f9YieNaOcMrYQG6XNLygC-bNexCHpYWfCjVdtts7=5Q@mail.gmail.com>","18":"1547863370143","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:512627d3fa03dd2f|#msg-a:r-4742963983885267953|0"},"2":"msg-a:r-3147389712012403088","3":1,"5":{"1":"1547863370156"}}}}},{"1":"16","2":{"1":"thread-a:r8235801758805685576","2":{"7":{"1":["^io_re"],"2":["^io_fwd"],"3":["msg-a:r-3147389712012403088"]}}}}]},"4":{"2":2,"3":"1547863370157","4":1,"5":81},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOnReplySend.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      { type: 'emailSending', draftID: 'r-4742963983885267953' },
      {
        draftID: 'r-4742963983885267953',
        type: 'emailSent',
        threadID: 'thread-a:r8235801758805685576',
        messageID: 'msg-a:r-4742963983885267953'
      }
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=17' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffDraftSave.json')
      )
    }
  );

  test('cv:off draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=17',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"2":{"1":[{"1":"6","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"3":{"1":{"1":"x","3":"1547864344081","4":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","5":[{"1":"msg-a:r1172851975112249697","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547864344081","8":"x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"}],"7":1},"11":["^all","^r","^r_bt","^io_im"],"18":"1547864344081","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r1172851975112249697|0"}]}}}}}]},"3":{"1":1,"2":"21848112","5":{"2":4},"6":"1622958358028407256","7":1},"4":{"2":1,"3":"1547864344092","4":0,"5":82},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffDraftSave.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      // TODO
      // #thread-a:r-6484824435222735158|msg-a:r1172851975112249697
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=23' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffSend.json')
      )
    }
  );

  test('cv:off send', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=23',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"7","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"14":{"1":{"1":"msg-a:r1172851975112249697","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547864572618","8":"x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"18":"1547864572618","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r1172851975112249697|0"},"3":1}}}}]},"4":{"2":1,"3":"1547864572634","4":1,"5":82},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffSend.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r1172851975112249697',
        type: 'emailSending'
      },
      {
        draftID: 'r1172851975112249697',
        messageID: 'msg-a:r1172851975112249697',
        oldMessageID: '16863eb04bbf6f14',
        oldThreadID: '16863e786439335a',
        rfcID:
          '<CAL_Ays_bOq9jhw5e3e1x7cBS9uYpqnGLYf8YnjrVZhM2e3q2xQ@mail.gmail.com>',
        // TODO fix thread id
        threadID: 'thread-a:r-6484824435222735158|msg-a:r1172851975112249697',
        type: 'emailSent'
      }
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=33' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffReplyDraftSave.json')
      )
    }
  );

  test('cv:off reply draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=33',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"2":{"1":[{"1":"11","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"2":{"1":{"1":"msg-a:r5342060334926697893","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547865092605","8":"Re: x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">y</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 6:22 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\">x</div>\n</blockquote></div>"}],"7":1},"11":["^all","^r","^r_bt","^io_im"],"16":"<CAL_Ays_bOq9jhw5e3e1x7cBS9uYpqnGLYf8YnjrVZhM2e3q2xQ@mail.gmail.com>","18":"1547865092605","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r5342060334926697893|0"},"2":"msg-a:r1172851975112249697","3":1,"5":{"1":"1547865092610"}}}}}]},"3":{"1":1,"2":"21848255","5":{"2":0},"7":1},"4":{"2":1,"3":"1547865092610","4":0,"5":82},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffReplyDraftSave.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r5342060334926697893',
        messageID: 'msg-a:r5342060334926697893',
        oldMessageID: '16863f2f591b2a8f',
        oldThreadID: '16863e786439335a',
        rfcID:
          '<CAL_Ays_CH2SPfzcVvRNkh6HQ+gF4REhq-vLLBrocRHYsfF9DKQ@mail.gmail.com>',
        // TODO fix thread id
        threadID: 'thread-a:r-6484824435222735158|msg-a:r1172851975112249697',
        type: 'emailDraftReceived'
      }
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=37' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffReplySend.json')
      )
    }
  );

  test('cv:off reply send', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=37',
      headers: {
        'Content-Type': 'application/json'
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"12","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"14":{"1":{"1":"msg-a:r5342060334926697893","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547865280656","8":"Re: x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">y</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 6:22 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\">x</div>\n</blockquote></div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"16":"<CAL_Ays_bOq9jhw5e3e1x7cBS9uYpqnGLYf8YnjrVZhM2e3q2xQ@mail.gmail.com>","18":"1547865280656","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r5342060334926697893|0"},"2":"msg-a:r1172851975112249697","3":1,"5":{"1":"1547865280676"}}}}},{"1":"13","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"7":{"1":["^io_re"],"2":["^io_fwd"],"3":["msg-a:r1172851975112249697"]}}}}]},"4":{"2":2,"3":"1547865280679","4":1,"5":81},"5":2}`
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffReplySend.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r5342060334926697893',
        type: 'emailSending'
      },
      // TODO fix
      {
        draftID: 'r5342060334926697893',
        type: 'emailSendFailed'
      }
    ]);
  });
});
