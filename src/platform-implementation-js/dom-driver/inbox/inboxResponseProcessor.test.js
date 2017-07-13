/* @flow */

import fs from 'fs';
import {extractMessageIdsFromThreadResponse} from './inboxResponseProcessor';

describe('extractMessageIdsFromThreadResponse()', () => {
  it('Lists the message IDs from a thread', () => {
    const threadResponse = fs.readFileSync(
      __dirname + '/../../../../test/data/inbox-thread-details-response-2017-07-13.json',
      'utf8'
    );
    expect(extractMessageIdsFromThreadResponse(threadResponse)).toEqual([
      'msg-a:r1490146031346228540',
      'msg-f:1572844139423482218'
    ]);
  });

  it('Throws when given invalid inputs', () => {
    const invalidJSON = JSON.stringify({junkKey: 'junkValue'});

    expect(() => extractMessageIdsFromThreadResponse(invalidJSON)).toThrow();
    expect(() => extractMessageIdsFromThreadResponse('')).toThrow();
  });
});
