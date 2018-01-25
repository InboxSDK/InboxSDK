/* @flow */

import fs from 'fs';

import * as SCRP from './sync-compose-request-processor';

it('handles first draft save', () => {

  const request = fs.readFileSync(
    __dirname+'/../../../__tests__/sync-compose-request-processor/first-draft-save-request-2018-01-25.json',
    'utf8'
  );

  const composeRequest = SCRP.getDetailsOfComposeRequest(request);
  expect(composeRequest).toMatchObject({
    body: "<div dir=\"ltr\">new new draft</div>",
    type: "FIRST_DRAFT_SAVE",
    draftID: "r-5205311597211900881",
    subject: "new draft"
  });

});

it('handles regular draft save', () => {

  const request = fs.readFileSync(
    __dirname+'/../../../__tests__/sync-compose-request-processor/draft-save-request-2018-01-25.json',
    'utf8'
  );

  const composeRequest = SCRP.getDetailsOfComposeRequest(request);
  expect(composeRequest).toMatchObject({
    body: "<div dir=\"ltr\">new new draft 2</div>",
    type: "DRAFT_SAVE",
    draftID: "r-5205311597211900881",
    subject: "new draft"
  });

});

it('handles sending', () => {

  const request = fs.readFileSync(
    __dirname+'/../../../__tests__/sync-compose-request-processor/send-request-2018-01-25.json',
    'utf8'
  );

  const composeRequest = SCRP.getDetailsOfComposeRequest(request);
  expect(composeRequest).toMatchObject({
    body: "<div dir=\"ltr\">new new draft 2</div>",
    type: "SEND",
    draftID: "r-5205311597211900881",
    subject: "new draft"
  });

});
