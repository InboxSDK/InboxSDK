import fs from 'fs';
import * as SCRP from './sync-compose-request-processor';
it('handles first draft save', () => {
  const request = fs.readFileSync(
    __dirname +
      '/../../../__tests__/sync-compose-request-processor/first-draft-save-request-2018-01-25.json',
    'utf8',
  );
  const composeRequest = SCRP.getDetailsOfComposeRequest(JSON.parse(request));
  expect(composeRequest).toMatchObject({
    body: '<div dir="ltr">new new draft</div>',
    type: 'FIRST_DRAFT_SAVE',
    draftID: 'r-5205311597211900881',
    subject: 'new draft',
    to: null,
    cc: null,
    bcc: null,
  });
});
it('handles regular draft save', () => {
  const request = fs.readFileSync(
    __dirname +
      '/../../../__tests__/sync-compose-request-processor/draft-save-request-2018-01-25.json',
    'utf8',
  );
  const composeRequest = SCRP.getDetailsOfComposeRequest(JSON.parse(request));
  expect(composeRequest).toMatchObject({
    body: '<div dir="ltr">new new draft 2</div>',
    type: 'DRAFT_SAVE',
    draftID: 'r-5205311597211900881',
    subject: 'new draft',
    to: null,
    cc: null,
    bcc: null,
  });
});
it('handles regular draft save with recipients', () => {
  const request = fs.readFileSync(
    __dirname +
      '/../../../__tests__/sync-compose-request-processor/draft-save-request-2018-01-25-with-recipients.json',
    'utf8',
  );
  const composeRequest = SCRP.getDetailsOfComposeRequest(JSON.parse(request));
  expect(composeRequest).toMatchObject({
    body: '<div dir="ltr">new new draft 2</div>',
    type: 'DRAFT_SAVE',
    draftID: 'r-5205311597211900881',
    subject: 'new draft',
    to: [
      {
        emailAddress: 'test+to@gmail.com',
        name: null,
      },
      {
        emailAddress: 'test+to2@gmail.com',
        name: 'test to2',
      },
    ],
    cc: [
      {
        emailAddress: 'test+cc@gmail.com',
        name: null,
      },
      {
        emailAddress: 'test+cc2@gmail.com',
        name: 'test cc2',
      },
    ],
    bcc: [
      {
        emailAddress: 'test+bcc@gmail.com',
        name: null,
      },
      {
        emailAddress: 'test+bcc2@gmail.com',
        name: 'test bcc2',
      },
    ],
  });
});
it('handles sending', () => {
  const request = fs.readFileSync(
    __dirname +
      '/../../../__tests__/sync-compose-request-processor/send-request-2018-01-25.json',
    'utf8',
  );
  const composeRequest = SCRP.getDetailsOfComposeRequest(JSON.parse(request));
  expect(composeRequest).toMatchObject({
    body: '<div dir="ltr">new new draft 2</div>',
    type: 'SEND',
    draftID: 'r-5205311597211900881',
    subject: 'new draft',
    to: [
      {
        emailAddress: 'test+to@test.com',
        name: null,
      },
    ],
    cc: null,
    bcc: null,
  });
});
