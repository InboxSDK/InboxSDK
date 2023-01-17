/* eslint-disable @typescript-eslint/no-var-requires */
import * as SCRP from './sync-compose-processor-20220909';

const expectedOutputByFile = {
  '2022-09-09-cvOnReplyDraftSave_request.json': {
    expected: {
      threadId: 'thread-f:1746035685735370050',
      messageId: 'msg-a:r-8480821811518170896',
      subject: 'Re: Your scheduled email did NOT send!',
      body: '<div dir="ltr">aostnuhaeu</div>',
      actions: ['^all', '^r', '^r_bt'],
      type: 'FIRST_DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2022_09_09,
  },
  '2022-09-09-cvOnReplyDraftSave_response.json': {
    expected: [
      {
        messageId: 'msg-a:r-8480821811518170896',
        threadId: 'thread-f:1746035685735370050',
        type: 'DRAFT_SAVE',
        actions: ['^all', '^r', '^r_bt'],
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2022_09_09,
  },
  '2022-09-09-cvOnReplyDraftUpdate_request.json': {
    expected: {
      body: '<div dir="ltr"><div dir="ltr" gmail_original="1">fish sticks</div><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">On Fri, Oct 7, 2022 at 9:29 AM Streak &lt;notifications@streak.com&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;"><div class="msg5849642694170245587">',
      messageId: 'msg-a:r-8480821811518170896',
      subject: 'Re: Your scheduled email did NOT send!',
      threadId: 'thread-f:1746035685735370050',
      type: 'DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2022_09_09,
  },
  '2022-09-09-cvOnReplyDraftUpdate_response.json': {
    expected: [
      {
        messageId: 'msg-a:r-8480821811518170896',
        threadId: 'thread-f:1746035685735370050',
        type: 'DRAFT_SAVE',
        actions: ['^all', '^r', '^r_bt'],
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2022_09_09,
  },
  '2022-09-09-cvOnDraftSaveBatched_request.json': {
    expected: {
      actions: ['^all', '^r', '^r_bt'],
      body: '<div dir="ltr"><br clear="all"><div><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><div><div><img src="https://ci6.googleusercontent.com/proxy/yyVKpfVZRWmljx1FfXa1jU7hg-YtDXUQin1Af7ML33AEnjvRq_sM6WcmJ8tHPhtsLEaO8P5iLvCTqzfmlsMn-K3x0xotmsjFPkkaNZx9UlXOtKN7pl2XTrJffpciKMDJeHnWq02y--TtyZwbYPEarzDHohZNYk1GKI04dQnOkTs=s0-d-e1-ft#https://assets-global.website-files.com/5b7f24cc9009731774d7be8e/5c06a15b95c700eebb7b9823_headerLockup_2x.png"></div></div><div>sdff</div><div>fsd</div><div>fsdf</div></div></div></div></div>',
      messageId: 'msg-a:r171568093711739042',
      subject: '',
      threadId: 'thread-a:r3299110183418933622',
      type: 'FIRST_DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2022_09_09,
  },
  '2022-09-09-cvOnDraftSaveBatched_response.json': {
    expected: [
      {
        actions: ['^a', '^all', '^f', '^f_bt', '^f_cl', '^pfg'],
        messageId: 'msg-a:r-173578382580458011',
        oldMessageId: '185ac55d43cf8449',
        oldThreadId: '185ac55b4cde8c29',
        rfcID:
          '<CAGx7AOSdr0csk8U=4qK=zS_8XekBNpkKa=xAKZXYt2ft9i7gcg@mail.gmail.com>',
        threadId: 'thread-a:r-175230870092109435',
        type: 'SEND',
      },
      {
        actions: ['^all', '^r', '^r_bt'],
        messageId: 'msg-a:r171568093711739042',
        oldMessageId: '185ac55f9930b088',
        oldThreadId: '185ac55f9930b088',
        rfcID:
          '<CAGx7AOSwKKeFbDNBTd+xXtNK4QTXAcVC7Avr2z5Vr8sK=FM7Ww@mail.gmail.com>',
        threadId: 'thread-a:r3299110183418933622',
        type: 'DRAFT_SAVE',
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2022_09_09,
  },
};

for (const [file, { parseWith, expected }] of Object.entries(
  expectedOutputByFile
)) {
  it(`handles on ${file}`, () => {
    const testData = JSON.stringify(require(`../../../test/data/${file}`));

    const maybeResult = parseWith(JSON.parse(testData));

    expect(maybeResult).toMatchObject(expected);
  });
}

it('handles onDraftSave request', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnDraftSave_request.json')
  );

  const composeRequest = SCRP.parseComposeRequestBody_2022_09_09(
    JSON.parse(request)
  );
  expect(composeRequest).toMatchObject({
    threadId: 'thread-a:r263523620390330024',
    messageId: 'msg-a:r8190137112111191537',
    subject: 'subject_111',
    body: '<div dir="ltr">a</div>',
    actions: ['^all', '^r', '^r_bt'],
    type: 'FIRST_DRAFT_SAVE',
  });
});

it('handles onDraftSave request', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnDraftUpdate_request.json')
  );

  const composeRequest = SCRP.parseComposeRequestBody_2022_09_09(
    JSON.parse(request)
  );
  expect(composeRequest).toMatchObject({
    threadId: 'thread-a:r263523620390330024',
    messageId: 'msg-a:r8190137112111191537',
    subject: 'subject_111',
    body: '<div dir="ltr">ab</div>',
    actions: ['^all', '^r', '^r_bt'],
    type: 'DRAFT_SAVE',
  });
});

it('handles onDraftSend request', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnSend_request.json')
  );

  const composeRequest = SCRP.parseComposeRequestBody_2022_09_09(
    JSON.parse(request)
  );
  expect(composeRequest).toMatchObject({
    threadId: 'thread-a:r263523620390330024',
    messageId: 'msg-a:r8190137112111191537',
    subject: 'subject_111',
    body: '<div dir="ltr">ab</div>',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl', '^i', '^u'],
    type: 'SEND',
  });
});

it('handles onDraftSend_2 request', () => {
  // cvOnSend_2_request_customThreadId was created
  // based on 2019-01-18-cvOffSend.json that has weird thread id field
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnSend_2_request_customThreadId.json')
  );

  const composeRequest = SCRP.parseComposeRequestBody_2022_09_09(
    JSON.parse(request)
  );
  expect(composeRequest).toMatchObject({
    threadId: 'thread-a:r263523620390330024',
    messageId: 'msg-a:r8190137112111191537',
    subject: 'subject_111',
    body: '<div dir="ltr">ab</div>',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl', '^i', '^u'],
    type: 'SEND',
  });
});

it('handles onReplySend request', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_request.json')
  );

  const composeRequest = SCRP.parseComposeRequestBody_2022_09_09(
    JSON.parse(request)
  );
  expect(composeRequest).toMatchObject({
    threadId: 'thread-a:r-474834441621213468',
    messageId: 'msg-a:r-414184523264894368',
    subject: 'Re: tracking test',
    body: '<div dir="ltr">foo2 (no tracking)</div>',
    actions: [
      '^all',
      '^pfg',
      '^f_bt',
      '^f_btns',
      '^f_cl',
      '^i',
      '^u',
      '^io_im',
      '^io_imc3',
    ],
    type: 'SEND',
  });
});

it('replaces onReplySend request body', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_request.json')
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2022_09_09(
      JSON.parse(request),
      'replaced_content'
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2022_09_09(
    replacedRequest!
  );

  expect(parsedRequest).toMatchObject({
    threadId: 'thread-a:r-474834441621213468',
    messageId: 'msg-a:r-414184523264894368',
    subject: 'Re: tracking test',
    body: 'replaced_content',
    actions: [
      '^all',
      '^pfg',
      '^f_bt',
      '^f_btns',
      '^f_cl',
      '^i',
      '^u',
      '^io_im',
      '^io_imc3',
    ],
    type: 'SEND',
  });
});

it('handles onReplySend_2 request', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_2_request.json')
  );

  const composeRequest = SCRP.parseComposeRequestBody_2022_09_09(
    JSON.parse(request)
  );
  expect(composeRequest).toMatchObject({
    threadId: 'thread-f:1743802434391390786',
    messageId: 'msg-a:r2026878197680476540',
    subject: 'Re: hey2',
    body: '<div dir="ltr">hey hey</div>',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl'],
    type: 'SEND',
  });
});

it('replaces onReplySend_2 request body', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_2_request.json')
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2022_09_09(
      JSON.parse(request),
      'replaced_content'
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2022_09_09(
    replacedRequest!
  );

  expect(parsedRequest).toMatchObject({
    threadId: 'thread-f:1743802434391390786',
    messageId: 'msg-a:r2026878197680476540',
    subject: 'Re: hey2',
    body: 'replaced_content',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl'],
    type: 'SEND',
  });
});
