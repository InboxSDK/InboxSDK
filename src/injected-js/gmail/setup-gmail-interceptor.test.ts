/* eslint-disable @typescript-eslint/no-unused-vars */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import MockServer from '../../../test/lib/MockServer';

jest.mock('../injected-logger', () => {
  return {
    error(err: Error, details?: any) {
      console.error(err, details);
      throw err;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    eventSdkPassive(name: string, details?: any) {},
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
  setupGmailInterceptorOnFrames(
    mainFrame as Partial<Window> as Window,
    jsFrame as Partial<Window> as Window
  );
});

const ajaxInterceptEvents: Array<Object> = [];
Kefir.fromEvents<{ detail: any }, unknown>(
  document,
  'inboxSDKajaxIntercept'
).onValue((event) => {
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
      ),
    }
  );

  test('cv:on send', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=32',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"6","2":{"1":"thread-a:r8235801758805685576","2":{"14":{"1":{"1":"msg-a:r-3147389712012403088","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547859067835","8":"","9":{"2":[{"1":0,"2":"<div dir=\"ltr\"><br></div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"18":"1547859067835","42":0,"43":{"1":0,"2":0,"3":0,"4":0},"52":"s:512627d3fa03dd2f|#msg-a:r-3147389712012403088|0"},"3":1}}}}]},"4":{"2":1,"3":"1547859067853","4":1,"5":83},"5":2}`,
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
        messageID: 'msg-a:r-3147389712012403088',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=80' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOnReplyDraftSave.json')
      ),
    }
  );

  test('cv:on reply draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=80',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"2":{"1":[{"1":"13","2":{"1":"thread-a:r8235801758805685576","2":{"2":{"1":{"1":"msg-a:r-4742963983885267953","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547862932860","8":"Re: ","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 4:51 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\"><br></div>\n</blockquote></div>"}],"7":1},"11":["^all","^r","^r_bt","^io_im"],"16":"<CAL_Ays_f9YieNaOcMrYQG6XNLygC-bNexCHpYWfCjVdtts7=5Q@mail.gmail.com>","18":"1547862932860","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:512627d3fa03dd2f|#msg-a:r-4742963983885267953|0"},"2":"msg-a:r-3147389712012403088","3":1,"5":{"1":"1547862932865"}}}}}]},"3":{"1":1,"2":"21847650","5":{"2":0},"7":1},"4":{"2":1,"3":"1547862932867","4":0,"5":81},"5":2}`,
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
        type: 'emailDraftReceived',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=76' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-05-29-cvOnDraftSave.json')
      ),
    }
  );

  test('cv:on draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=76',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"2":{"1":[{"1":"23","2":{"1":"thread-a:r-5923235777735080743","2":{"3":{"1":{"1":"","3":"1559183445219","4":"thread-a:r-5923235777735080743","5":[{"1":"msg-a:r4410172531046441555","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"7":"1559183445219","8":"","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">a</div>"}],"7":1},"11":["^all","^r","^r_bt"],"18":"1559183445219","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:116405b570aeb88e|#msg-a:r4410172531046441555|0"}]}}}}}]},"3":{"1":1,"2":"24043806","5":{"2":0},"7":1},"4":{"2":1,"3":"1559183445223","4":0,"5":83},"5":2}`,
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-05-29-cvOnDraftSave.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r4410172531046441555',
        messageID: 'msg-a:r4410172531046441555',
        oldMessageID: '16b069351bf08519',
        oldThreadID: '16b069351bf08519',
        rfcID:
          '<CAL_Ays9Vr38qeL9=MsYHm069xbzkf5qyAsPd+PDF6cOH6UHgWw@mail.gmail.com>',
        threadID: 'thread-a:r-5923235777735080743',
        type: 'emailDraftReceived',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=84' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOnReplySend.json')
      ),
    }
  );

  test('cv:on send reply', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=84',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"15","2":{"1":"thread-a:r8235801758805685576","2":{"14":{"1":{"1":"msg-a:r-4742963983885267953","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547863370143","8":"Re: ","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 4:51 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\"><br></div>\n</blockquote></div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"16":"<CAL_Ays_f9YieNaOcMrYQG6XNLygC-bNexCHpYWfCjVdtts7=5Q@mail.gmail.com>","18":"1547863370143","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:512627d3fa03dd2f|#msg-a:r-4742963983885267953|0"},"2":"msg-a:r-3147389712012403088","3":1,"5":{"1":"1547863370156"}}}}},{"1":"16","2":{"1":"thread-a:r8235801758805685576","2":{"7":{"1":["^io_re"],"2":["^io_fwd"],"3":["msg-a:r-3147389712012403088"]}}}}]},"4":{"2":2,"3":"1547863370157","4":1,"5":81},"5":2}`,
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
        messageID: 'msg-a:r-4742963983885267953',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=17' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffDraftSave.json')
      ),
    }
  );

  test('cv:off draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=17',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"2":{"1":[{"1":"6","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"3":{"1":{"1":"x","3":"1547864344081","4":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","5":[{"1":"msg-a:r1172851975112249697","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547864344081","8":"x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"}],"7":1},"11":["^all","^r","^r_bt","^io_im"],"18":"1547864344081","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r1172851975112249697|0"}]}}}}}]},"3":{"1":1,"2":"21848112","5":{"2":4},"6":"1622958358028407256","7":1},"4":{"2":1,"3":"1547864344092","4":0,"5":82},"5":2}`,
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffDraftSave.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r1172851975112249697',
        messageID: 'msg-f:1622952667964122704',
        oldMessageID: '1685e2da4d462650',
        oldThreadID: '1685e2da4d462650',
        rfcID: '<1547768275469.7c3cd5014f32a@Nodemailer>',
        threadID: 'thread-f:1622952667964122704',
        type: 'emailDraftReceived',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=23' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffSend.json')
      ),
    }
  );

  test('cv:off send', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=23',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"7","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"14":{"1":{"1":"msg-a:r1172851975112249697","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547864572618","8":"x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">x</div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"18":"1547864572618","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r1172851975112249697|0"},"3":1}}}}]},"4":{"2":1,"3":"1547864572634","4":1,"5":82},"5":2}`,
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffSend.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r1172851975112249697',
        type: 'emailSending',
      },
      {
        draftID: 'r1172851975112249697',
        messageID: 'msg-a:r1172851975112249697',
        oldMessageID: '16863eb04bbf6f14',
        oldThreadID: '16863e786439335a',
        rfcID:
          '<CAL_Ays_bOq9jhw5e3e1x7cBS9uYpqnGLYf8YnjrVZhM2e3q2xQ@mail.gmail.com>',
        threadID: 'thread-a:r-6484824435222735158',
        type: 'emailSent',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=33' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffReplyDraftSave.json')
      ),
    }
  );

  test('cv:off reply draft save', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=33',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"2":{"1":[{"1":"11","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"2":{"1":{"1":"msg-a:r5342060334926697893","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547865092605","8":"Re: x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">y</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 6:22 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\">x</div>\n</blockquote></div>"}],"7":1},"11":["^all","^r","^r_bt","^io_im"],"16":"<CAL_Ays_bOq9jhw5e3e1x7cBS9uYpqnGLYf8YnjrVZhM2e3q2xQ@mail.gmail.com>","18":"1547865092605","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r5342060334926697893|0"},"2":"msg-a:r1172851975112249697","3":1,"5":{"1":"1547865092610"}}}}}]},"3":{"1":1,"2":"21848255","5":{"2":0},"7":1},"4":{"2":1,"3":"1547865092610","4":0,"5":82},"5":2}`,
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
        threadID: 'thread-a:r-6484824435222735158',
        type: 'emailDraftReceived',
      },
    ]);
  });

  mainServer.respondWith(
    { method: 'POST', path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=37' },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2019-01-18-cvOffReplySend.json')
      ),
    }
  );

  test('cv:off reply send', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=37',
      headers: {
        'Content-Type': 'application/json',
      },
      data: raw`{"1":{"3":2},"2":{"1":[{"1":"12","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"14":{"1":{"1":"msg-a:r5342060334926697893","2":{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"},"3":[{"1":1,"2":"cowan@streak.com","3":"Chris Cowan"}],"7":"1547865280656","8":"Re: x","9":{"2":[{"1":0,"2":"<div dir=\"ltr\">y</div>"},{"1":2,"2":"<br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Fri, Jan 18, 2019 at 6:22 PM Chris Cowan &lt;cowan@streak.com&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;\"><div dir=\"ltr\">x</div>\n</blockquote></div>"}],"7":1},"11":["^all","^pfg","^f_bt","^f_btns","^f_cl","^i","^u","^io_im"],"16":"<CAL_Ays_bOq9jhw5e3e1x7cBS9uYpqnGLYf8YnjrVZhM2e3q2xQ@mail.gmail.com>","18":"1547865280656","42":0,"43":{"1":0,"2":0,"3":1,"4":0},"52":"s:7443fe0f19af83b2|#msg-a:r5342060334926697893|0"},"2":"msg-a:r1172851975112249697","3":1,"5":{"1":"1547865280676"}}}}},{"1":"13","2":{"1":"thread-a:r-6484824435222735158|msg-a:r1172851975112249697","2":{"7":{"1":["^io_re"],"2":["^io_fwd"],"3":["msg-a:r1172851975112249697"]}}}}]},"4":{"2":2,"3":"1547865280679","4":1,"5":81},"5":2}`,
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2019-01-18-cvOffReplySend.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r5342060334926697893',
        type: 'emailSending',
      },
      {
        draftID: 'r5342060334926697893',
        threadID: 'thread-a:r-6484824435222735158',
        messageID: 'msg-a:r5342060334926697893',
        oldMessageID: '16863f5d2b7ddd8d',
        oldThreadID: '16863e786439335a',
        rfcID:
          '<CAL_Ays8zR1gD3aWK2a=c9+nuLXQVOUUjg2EZPTFeCLNmFN59Ug@mail.gmail.com>',
        type: 'emailSent',
      },
    ]);
  });

  mainServer.respondWith(
    {
      method: 'POST',
      path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_01&rt=r&pt=ji',
    },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnDraftSave_response.json')
      ),
    }
  );

  test('cv:2022-09-09 draft saved', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_01&rt=r&pt=ji',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnDraftSave_request.json')
      ),
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2022-09-09-cvOnDraftSave_response.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r8190137112111191537',
        threadID: 'thread-a:r263523620390330024',
        messageID: 'msg-a:r8190137112111191537',
        oldMessageID: '183234ce86ffa010',
        oldThreadID: '183234ce86ffa010',
        rfcID:
          '\u003cCAFsK+UTN\u003dz14aGfUY8\u003duw7O3yEmn2_ciGoq0o22SeK8dC4kkRw@mail.gmail.com\u003e',
        type: 'emailDraftReceived',
      },
    ]);
  });

  mainServer.respondWith(
    {
      method: 'POST',
      path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_02&rt=r&pt=ji',
    },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnDraftUpdate_response.json')
      ),
    }
  );

  test('cv:2022-09-09 draft updated', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_02&rt=r&pt=ji',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnDraftUpdate_request.json')
      ),
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2022-09-09-cvOnDraftUpdate_response.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      {
        draftID: 'r8190137112111191537',
        threadID: 'thread-a:r263523620390330024',
        messageID: 'msg-a:r8190137112111191537',
        oldMessageID: '183234e210caa042',
        oldThreadID: '183234ce86ffa010',
        rfcID:
          '\u003cCAFsK+USFooaLjvYfUz4QLdCqAQS_PunKeWVvQgpso31w2PkPMA@mail.gmail.com\u003e',
        type: 'emailDraftReceived',
      },
    ]);
  });

  mainServer.respondWith(
    {
      method: 'POST',
      path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_03&rt=r&pt=ji',
    },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnSend_response.json')
      ),
    }
  );

  test('cv:2022-09-09 draft sent', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_03&rt=r&pt=ji',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnSend_request.json')
      ),
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2022-09-09-cvOnSend_response.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      { type: 'emailSending', draftID: 'r8190137112111191537' },
      {
        draftID: 'r8190137112111191537',
        threadID: 'thread-a:r263523620390330024',
        messageID: 'msg-a:r8190137112111191537',
        oldMessageID: '183234eaadcf41e5',
        oldThreadID: '183234ce86ffa010',
        rfcID:
          '\u003cCAFsK+UQf12W_Efo3+hwj+BWb+sk8DaGQkrOoBOU38nHafAHJ4Q@mail.gmail.com\u003e',
        type: 'emailSent',
      },
    ]);
  });

  mainServer.respondWith(
    {
      method: 'POST',
      path: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_03_01&rt=r&pt=ji',
    },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnSend_2_response_customThreadId.json')
      ),
    }
  );

  test('cv:2022-09-09 draft sent', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/0/i/s?hl=en&c=20220909_03_01&rt=r&pt=ji',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnSend_2_request_customThreadId.json')
      ),
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2022-09-09-cvOnSend_2_response_customThreadId.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      { type: 'emailSending', draftID: 'r8190137112111191537' },
      {
        draftID: 'r8190137112111191537',
        threadID: 'thread-a:r263523620390330024',
        messageID: 'msg-a:r8190137112111191537',
        oldMessageID: '183234eaadcf41e5',
        oldThreadID: '183234ce86ffa010',
        rfcID:
          '\u003cCAFsK+UQf12W_Efo3+hwj+BWb+sk8DaGQkrOoBOU38nHafAHJ4Q@mail.gmail.com\u003e',
        type: 'emailSent',
      },
    ]);
  });

  mainServer.respondWith(
    {
      method: 'POST',
      path: 'https://mail.google.com/sync/u/1/i/s?hl=en&c=39&rt=r&pt=ji',
    },
    {
      status: 200,
      response: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnReplySend_response.json')
      ),
    }
  );

  test('cv:2022-09-09 reply draft sent', async () => {
    const response = await ajax(mainFrame, {
      method: 'POST',
      url: 'https://mail.google.com/sync/u/1/i/s?hl=en&c=39&rt=r&pt=ji',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(
        require('../../../test/data/2022-09-09-cvOnReplySend_request.json')
      ),
    });
    expect(JSON.parse(response.text)).toEqual(
      require('../../../test/data/2022-09-09-cvOnReplySend_response.json')
    );
    expect(ajaxInterceptEvents).toEqual([
      { type: 'emailSending', draftID: 'r-414184523264894368' },
      {
        draftID: 'r-414184523264894368',
        threadID: 'thread-a:r-474834441621213468',
        messageID: 'msg-a:r-414184523264894368',
        oldMessageID: '1833309f6f6ac78f',
        oldThreadID: '18332e4292f304f1',
        rfcID:
          '<CAFxDt-NBAWENo5CdNqGdhzQcsu9rvLERnKDGh_4h5ikqnpf8wA@mail.gmail.com>',
        type: 'emailSent',
      },
    ]);
  });
});

mainServer.respondWith(
  {
    method: 'POST',
    path: 'https://mail.google.com/sync/u/1/i/s?hl=en&c=20220909_04&rt=r&pt=ji',
  },
  {
    status: 200,
    response: JSON.stringify(
      require('../../../test/data/2022-09-09-cvOnReplySend_2_response.json')
    ),
  }
);

test('cv:2022-09-09 reply draft 2 sent', async () => {
  const response = await ajax(mainFrame, {
    method: 'POST',
    url: 'https://mail.google.com/sync/u/1/i/s?hl=en&c=20220909_04&rt=r&pt=ji',
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(
      require('../../../test/data/2022-09-09-cvOnReplySend_2_request.json')
    ),
  });
  expect(JSON.parse(response.text)).toEqual(
    require('../../../test/data/2022-09-09-cvOnReplySend_2_response.json')
  );
  expect(ajaxInterceptEvents).toEqual([
    { type: 'emailSending', draftID: 'r2026878197680476540' },
    {
      draftID: 'r2026878197680476540',
      threadID: 'thread-f:1743802434391390786',
      messageID: 'msg-a:r2026878197680476540',
      oldMessageID: '18333b1f5712f659',
      oldThreadID: '18333b13345c3a42',
      rfcID:
        '\u003cCAFxDt-NiTcOcChGTdnjfqAW4x-A6VaVkW\u003djd2y8jE1bJajCULg@mail.gmail.com\u003e',
      type: 'emailSent',
    },
  ]);
});

{
  const pathPrefix = '../../../test/data/';

  const replyDraftTests = [
    {
      filePrefix: '2022-09-09-cvOnReplyDraftSave_',
      expectedEvents: [
        {
          draftID: 'r-8480821811518170896',
          messageID: 'msg-a:r-8480821811518170896',
          oldMessageID: '183b3f46fdd71d6d',
          oldThreadID: '183b2a348d698d42',
          rfcID:
            '<CAF9MChDSw8XuwCujg22rOq_GWvVnox18mduqhVU8n=Nt+fF+tA@mail.gmail.com>',
          threadID: 'thread-f:1746035685735370050',
          type: 'emailDraftReceived',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnReplyDraftUpdate_',
      expectedEvents: [
        {
          draftID: 'r-8480821811518170896',
          messageID: 'msg-a:r-8480821811518170896',
          oldMessageID: '183b3f64980e72a8',
          oldThreadID: '183b2a348d698d42',
          rfcID:
            '<CAF9MChCxDJ-7o=k2qnsD_JAMz9hBwU6uSO7TpeyeznRSQVywqg@mail.gmail.com>',
          threadID: 'thread-f:1746035685735370050',
          type: 'emailDraftReceived',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnDraftSaveBatched_',
      expectedEvents: [
        {
          draftID: 'r171568093711739042',
          messageID: 'msg-a:r171568093711739042',
          oldMessageID: '185ac55f9930b088',
          oldThreadID: '185ac55f9930b088',
          rfcID:
            '<CAGx7AOSwKKeFbDNBTd+xXtNK4QTXAcVC7Avr2z5Vr8sK=FM7Ww@mail.gmail.com>',
          threadID: 'thread-a:r3299110183418933622',
          type: 'emailDraftReceived',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnDraftUpdate_2_',
      expectedEvents: [
        {
          draftID: 'r-9122305152175603305',
          messageID: 'msg-a:r-9122305152175603305',
          oldMessageID: '183fcbefc9f0d769',
          oldThreadID: '183fcbe5afa22467',
          rfcID:
            '\u003cCAGx7AORFVLcZ_3sE54WvX3+bb6CkVrds8Nu27Je+atJRLy8DsQ@mail.gmail.com\u003e',
          threadID: 'thread-a:r-1030145228305804508',
          type: 'emailDraftReceived',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnSend_3_',
      expectedEvents: [
        { type: 'emailSending', draftID: 'r-329565169840451245' },
        {
          draftID: 'r-329565169840451245',
          messageID: 'msg-a:r-329565169840451245',
          oldMessageID: '183fcc5cc03fea78',
          oldThreadID: '183fcc554fa6f2dd',
          rfcID:
            '\u003cCAGx7AOQiYaKpc6Zb5\u003d+mRqU3K-WF+G3KxmmaYKdzCisHqSaRAQ@mail.gmail.com\u003e',
          threadID: 'thread-a:r-8891700334768116294',
          type: 'emailSent',
        },
      ],
    },
    {
      // parsing should prioritize SEND to DRAFT_SAVE action
      filePrefix: '2022-09-09-cvOnSend_4_',
      expectedEvents: [
        { type: 'emailSending', draftID: 'r-329565169840451245' },
        {
          draftID: 'r-329565169840451245',
          messageID: 'msg-a:r-329565169840451245',
          oldMessageID: '183fcc5cc03fea78',
          oldThreadID: '183fcc554fa6f2dd',
          rfcID:
            '\u003cCAGx7AOQiYaKpc6Zb5\u003d+mRqU3K-WF+G3KxmmaYKdzCisHqSaRAQ@mail.gmail.com\u003e',
          threadID: 'thread-a:r-8891700334768116294',
          type: 'emailSent',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnReplyDraftUpdate_2_',
      expectedEvents: [
        {
          threadID: 'thread-a:r-1030145228305804508',
          messageID: 'msg-a:r7241715802500133864',
          draftID: 'r7241715802500133864',
          oldMessageID: '183fcc0bcf2875d8',
          oldThreadID: '183fcbe5afa22467',
          rfcID:
            '\u003cCAGx7AOT3v9AK8-PdxP+zGJwCXOYsDxLm8BF2QvufxFK_BtO5WA@mail.gmail.com\u003e',
          type: 'emailDraftReceived',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnReplyDraftUpdate_3_',
      expectedEvents: [
        {
          threadID: 'thread-a:r-2602384757092328293',
          messageID: 'msg-a:r9206449609684993976',
          draftID: 'r9206449609684993976',
          oldMessageID: '185c12c05154feaa',
          oldThreadID: '185c12a5072cb2fa',
          rfcID:
            '\u003cCAGx7AORVTxnFB3C_dyNbFNCCJMs_HQ0Chd6mq+24NERJrYSrYw@mail.gmail.com\u003e',
          type: 'emailDraftReceived',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnReplySend_3_',
      expectedEvents: [
        { type: 'emailSending', draftID: 'r7241715802500133864' },
        {
          threadID: 'thread-a:r-1030145228305804508',
          messageID: 'msg-a:r7241715802500133864',
          draftID: 'r7241715802500133864',
          oldMessageID: '183fcc3c75f0255e',
          oldThreadID: '183fcbe5afa22467',
          rfcID:
            '\u003cCAGx7AOR_\u003dmWqD-p+Di3YbkA+zKP5Hk57LOhMUY5J1-\u003drCF+Vmg@mail.gmail.com\u003e',
          type: 'emailSent',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnReplySend_4_',
      expectedEvents: [
        { type: 'emailSending', draftID: 'r9206449609684993976' },
        {
          threadID: 'thread-a:r-2602384757092328293',
          messageID: 'msg-a:r9206449609684993976',
          draftID: 'r9206449609684993976',
          oldMessageID: '185c13432b3eb04b',
          oldThreadID: '185c12a5072cb2fa',
          rfcID:
            '\u003cCAGx7AOREcWgHg9fjp0oT3hV4kt_6Wu6O0W9-hzuFuv2jbQdbVw@mail.gmail.com\u003e',
          type: 'emailSent',
        },
      ],
    },
    {
      filePrefix: '2022-09-09-cvOnReplySend_5_',
      expectedEvents: [
        { type: 'emailSending', draftID: 'r5645180764593433440' },
        {
          threadID: 'thread-a:r-7504980498209780070',
          messageID: 'msg-a:r5645180764593433440',
          draftID: 'r5645180764593433440',
          oldMessageID: '185c153a4f028cb5',
          oldThreadID: '185c1536996a61dc',
          rfcID:
            '\u003cCAGx7AOTGUP2_JUYoZioTKJLFOx1L0-Rhuzd2h9KwOgDr2ZXrWw@mail.gmail.com\u003e',
          type: 'emailSent',
        },
      ],
    },
  ];

  let cIndex = 100;
  for (const { filePrefix, expectedEvents } of replyDraftTests) {
    const path = `https://mail.google.com/sync/u/0/i/s?hl=en&c=${cIndex++}&rt=r&pt=ji`;

    const responseData = require(pathPrefix + filePrefix + 'response.json');
    const requestData = JSON.stringify(
      require(pathPrefix + filePrefix + 'request.json')
    );

    mainServer.respondWith(
      {
        method: 'POST',
        path,
      },
      {
        status: 200,
        response: JSON.stringify(responseData),
      }
    );

    test(`${filePrefix} sent`, async () => {
      const response = await ajax(mainFrame, {
        method: 'POST',
        url: path,
        headers: {
          'Content-Type': 'application/json',
        },
        data: requestData,
      });
      expect(JSON.parse(response.text)).toEqual(responseData);
      expect(ajaxInterceptEvents).toEqual(expectedEvents);
    });
  }
}
