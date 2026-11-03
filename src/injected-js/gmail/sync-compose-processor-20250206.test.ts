import * as SCRP from './sync-compose-processor-20250206';

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
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
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
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnReplyDraftUpdate_request.json': {
    expected: {
      body: '<div dir="ltr"><div dir="ltr" gmail_original="1">fish sticks</div><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">On Fri, Oct 7, 2022 at 9:29 AM Streak &lt;notifications@streak.com&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;"><div class="msg5849642694170245587">',
      messageId: 'msg-a:r-8480821811518170896',
      subject: 'Re: Your scheduled email did NOT send!',
      threadId: 'thread-f:1746035685735370050',
      type: 'DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
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
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
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
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
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
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnDraftUpdate_2_request.json': {
    expected: {
      threadId: 'thread-a:r-1030145228305804508',
      messageId: 'msg-a:r-9122305152175603305',
      to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
      cc: [{ emailAddress: 'test+cc@test.com', name: 'test cc' }],
      bcc: [{ emailAddress: 'test+bcc@test.com', name: 'test bcc' }],
      subject: 'test subject',
      body: '<div dir="ltr">test body</div>',
      type: 'DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnDraftUpdate_2_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-1030145228305804508',
        messageId: 'msg-a:r-9122305152175603305',
        to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
        cc: [{ emailAddress: 'test+cc@test.com', name: 'test cc' }],
        bcc: [{ emailAddress: 'test+bcc@test.com', name: 'test bcc' }],
        type: 'DRAFT_SAVE',
        actions: ['^all', '^r', '^r_bt'],
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnSend_3_request.json': {
    expected: {
      threadId: 'thread-a:r-8891700334768116294',
      messageId: 'msg-a:r-329565169840451245',
      to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
      cc: [{ emailAddress: 'test+cc@test.com', name: 'test cc' }],
      bcc: [{ emailAddress: 'test+bcc@test.com', name: 'test bcc' }],
      subject: 'test subject',
      body: '<div dir="ltr">test body</div><div hspace="test-pt-mark" style="max-height:1px;"><img alt="" style="width:0px;max-height:0px;overflow:hidden" src="https://dev.mailfoogae.appspot.com:8888/t?sender=aYm9yeXNAc3RyZWFrLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=b3b2b759-451a-4c4c-b620-27259f4a4907"><font color="#ffffff" size="1">ᐧ</font></div>',
      type: 'SEND',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnSend_3_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-8891700334768116294',
        messageId: 'msg-a:r-329565169840451245',
        to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
        cc: [{ emailAddress: 'test+cc@test.com', name: 'test cc' }],
        bcc: [{ emailAddress: 'test+bcc@test.com', name: 'test bcc' }],
        actions: [
          '^all',
          '^f',
          '^f_bt',
          '^f_cl',
          '^i',
          '^pfg',
          '^sq_ig_i_personal',
          '^u',
        ],
        type: 'SEND',
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnReplyDraftUpdate_2_request.json': {
    expected: {
      threadId: 'thread-a:r-1030145228305804508',
      messageId: 'msg-a:r7241715802500133864',
      to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
      cc: [
        { emailAddress: 'test+cc@test.com', name: 'test cc' },
        { emailAddress: 'test+cc2@test.com', name: null },
      ],
      bcc: [{ emailAddress: 'test+bcc2@test.com', name: 'test bcc2' }],
      subject: 'Re: test subject',
      body: '<div dir="ltr">test reply body</div>',
      type: 'DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnReplyDraftUpdate_2_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-1030145228305804508',
        messageId: 'msg-a:r7241715802500133864',
        to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
        cc: [
          { emailAddress: 'test+cc@test.com', name: 'test cc' },
          { emailAddress: 'test+cc2@test.com', name: null },
        ],
        bcc: [{ emailAddress: 'test+bcc2@test.com', name: 'test bcc2' }],
        type: 'DRAFT_SAVE',
        actions: ['^all', '^r', '^r_bt'],
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnReplyDraftUpdate_3_request.json': {
    expected: {
      threadId: 'thread-a:r-2602384757092328293',
      messageId: 'msg-a:r9206449609684993976',
      to: [{ emailAddress: 'test+to@gmail.com', name: 'Test Test' }],
      cc: null,
      bcc: null,
      subject: 'Re: test_subject',
      body: '<div dir="ltr">b2</div>',
      type: 'DRAFT_SAVE',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnReplyDraftUpdate_3_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-2602384757092328293',
        messageId: 'msg-a:r9206449609684993976',
        to: [{ emailAddress: 'test+to@gmail.com', name: 'Test Test' }],
        cc: null,
        bcc: null,
        type: 'DRAFT_SAVE',
        actions: ['^all', '^r', '^r_bt'],
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnReplySend_3_request.json': {
    expected: {
      threadId: 'thread-a:r-1030145228305804508',
      messageId: 'msg-a:r7241715802500133864',
      to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
      cc: [
        { emailAddress: 'test+cc@test.com', name: 'test cc' },
        { emailAddress: 'test+cc2@test.com', name: null },
      ],
      bcc: [{ emailAddress: 'test+bcc2@test.com', name: 'test bcc2' }],
      subject: 'Re: test subject',
      body: '<div dir="ltr">test reply body</div><div hspace="test-pt-mark" style="max-height:1px;"><img alt="" style="width:0px;max-height:0px;overflow:hidden" src="https://dev.mailfoogae.appspot.com:8888/t?sender=aYm9yeXNAc3RyZWFrLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=19b740a4-1742-41cb-93f7-c0b77319260c"><font color="#ffffff" size="1">ᐧ</font></div>',
      type: 'SEND',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnReplySend_3_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-1030145228305804508',
        messageId: 'msg-a:r7241715802500133864',
        to: [{ emailAddress: 'test+to@test.com', name: 'test to' }],
        cc: [
          { emailAddress: 'test+cc@test.com', name: 'test cc' },
          { emailAddress: 'test+cc2@test.com', name: null },
        ],
        bcc: [{ emailAddress: 'test+bcc2@test.com', name: 'test bcc2' }],
        actions: [
          '^all',
          '^f',
          '^f_bt',
          '^f_cl',
          '^i',
          '^pfg',
          '^sq_ig_i_personal',
          '^u',
        ],
        type: 'SEND',
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnReplySend_4_request.json': {
    expected: {
      threadId: 'thread-a:r-2602384757092328293',
      messageId: 'msg-a:r9206449609684993976',
      to: [{ emailAddress: 'test+to@gmail.com', name: 'Test Test' }],
      cc: null,
      bcc: null,
      subject: 'Re: test_subject',
      body: '<div dir="ltr">b2</div><div hspace="streak-pt-mark" style="max-height:1px;"><img alt="" style="width:0px;max-height:0px;overflow:hidden" src="https://mailfoogae.appspot.com/t?sender=aYm9yeXNAc3RyZWFrLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=0bffb01a-61aa-4e14-b1b5-82b115ecbad3"><font color="#ffffff" size="1">ᐧ</font></div>',
      type: 'SEND',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnReplySend_4_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-2602384757092328293',
        messageId: 'msg-a:r9206449609684993976',
        to: [{ emailAddress: 'test+to@gmail.com', name: 'Test Test' }],
        cc: null,
        bcc: null,
        actions: ['^all', '^f', '^f_bt', '^f_cl', '^pfg'],
        type: 'SEND',
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
  '2022-09-09-cvOnReplySend_5_request.json': {
    expected: {
      threadId: 'thread-a:r-7504980498209780070',
      messageId: 'msg-a:r5645180764593433440',
      to: [{ emailAddress: 'test+to@gmail.com', name: 'Test to' }],
      cc: null,
      bcc: null,
      subject: 'Re: test subject 4',
      body: '<div dir="ltr">b</div>',
      type: 'SEND',
    },
    parseWith: SCRP.parseComposeRequestBody_2025_02_06,
  },
  '2022-09-09-cvOnReplySend_5_response.json': {
    expected: [
      {
        threadId: 'thread-a:r-7504980498209780070',
        messageId: 'msg-a:r2752434536700201264',
        to: [{ emailAddress: 'test+to@gmail.com', name: 'test to' }],
        cc: null,
        bcc: null,
        actions: [
          '^a',
          '^all',
          '^f',
          '^f_bt',
          '^f_cl',
          '^io_lr',
          '^io_re',
          '^o',
          '^pfg',
        ],
        type: 'SEND',
      },
      {
        threadId: 'thread-a:r-7504980498209780070',
        messageId: 'msg-a:r5645180764593433440',
        to: [{ emailAddress: 'test+to@gmail.com', name: 'test to' }],
        cc: null,
        bcc: null,
        actions: ['^all', '^f', '^f_bt', '^f_cl', '^pfg'],
        type: 'SEND',
      },
    ],
    parseWith: SCRP.parseComposeResponseBody_2025_02_06,
  },
};

for (const [file, { parseWith, expected }] of Object.entries(
  expectedOutputByFile,
)) {
  it(`handles on ${file}`, () => {
    const testData = JSON.stringify(require(`../../../test/data/${file}`));

    const maybeResult = parseWith(JSON.parse(testData));

    expect(maybeResult).toMatchObject(expected);
  });
}

it('handles onDraftSave request', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnDraftSave_request.json'),
  );

  const composeRequest = SCRP.parseComposeRequestBody_2025_02_06(
    JSON.parse(request),
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
    require('../../../test/data/2022-09-09-cvOnDraftUpdate_request.json'),
  );

  const composeRequest = SCRP.parseComposeRequestBody_2025_02_06(
    JSON.parse(request),
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
    require('../../../test/data/2022-09-09-cvOnSend_request.json'),
  );

  const composeRequest = SCRP.parseComposeRequestBody_2025_02_06(
    JSON.parse(request),
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
    require('../../../test/data/2022-09-09-cvOnSend_2_request_customThreadId.json'),
  );

  const composeRequest = SCRP.parseComposeRequestBody_2025_02_06(
    JSON.parse(request),
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
    require('../../../test/data/2022-09-09-cvOnReplySend_request.json'),
  );

  const composeRequest = SCRP.parseComposeRequestBody_2025_02_06(
    JSON.parse(request),
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
    require('../../../test/data/2022-09-09-cvOnReplySend_request.json'),
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2025_02_06(
      JSON.parse(request),
      'replaced_content',
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2025_02_06(
    replacedRequest!,
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
    require('../../../test/data/2022-09-09-cvOnReplySend_2_request.json'),
  );

  const composeRequest = SCRP.parseComposeRequestBody_2025_02_06(
    JSON.parse(request),
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
    require('../../../test/data/2022-09-09-cvOnReplySend_2_request.json'),
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2025_02_06(
      JSON.parse(request),
      'replaced_content',
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2025_02_06(
    replacedRequest!,
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

it('replaces onReplySend_3 request body', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_3_request.json'),
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2025_02_06(
      JSON.parse(request),
      'replaced_content',
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2025_02_06(
    replacedRequest!,
  );

  expect(parsedRequest).toMatchObject({
    threadId: 'thread-a:r-1030145228305804508',
    messageId: 'msg-a:r7241715802500133864',
    subject: 'Re: test subject',
    body: 'replaced_content',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl', '^i', '^u'],
    type: 'SEND',
  });
});

it('replaces onReplySend_4 request body', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_4_request.json'),
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2025_02_06(
      JSON.parse(request),
      'replaced_content',
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2025_02_06(
    replacedRequest!,
  );

  expect(parsedRequest).toMatchObject({
    threadId: 'thread-a:r-2602384757092328293',
    messageId: 'msg-a:r9206449609684993976',
    subject: 'Re: test_subject',
    body: 'replaced_content',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl'],
    type: 'SEND',
  });
});

it('replaces onReplySend_5 request body', () => {
  const request = JSON.stringify(
    require('../../../test/data/2022-09-09-cvOnReplySend_5_request.json'),
  );

  const replacedRequest =
    SCRP.replaceBodyContentInComposeSendRequestBody_2025_02_06(
      JSON.parse(request),
      'replaced_content',
    );

  const parsedRequest = SCRP.parseComposeRequestBody_2025_02_06(
    replacedRequest!,
  );

  expect(parsedRequest).toMatchObject({
    threadId: 'thread-a:r-7504980498209780070',
    messageId: 'msg-a:r5645180764593433440',
    subject: 'Re: test subject 4',
    body: 'replaced_content',
    actions: ['^all', '^pfg', '^f_bt', '^f_btns', '^f_cl'],
    type: 'SEND',
  });
});
