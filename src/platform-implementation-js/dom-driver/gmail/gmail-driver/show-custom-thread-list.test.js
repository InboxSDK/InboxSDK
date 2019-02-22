/* @flow */

import showCustomThreadList from './show-custom-thread-list';

import * as GSRP from '../gmail-sync-response-processor';

import fs from 'fs';
import once from 'lodash/once';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

const readFile = fs.promises.readFile;

beforeAll(() => {
  (document.body: any).innerHTML = `
  <div>
    <form role="search">
      <input type="text">
    </form>
  </div>
`;
});

class ShowCustomThreadListTester {
  _ajaxInterceptStream = kefirBus();
  _customListNewQueryBus = kefirBus();
  _customListResultsBus = kefirBus();
  _allowGmailThreadIdLookup = kefirBus();
  _driver: any = {
    isUsingSyncAPI: () => true,
    getLogger: once(() => ({
      error(e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    })),
    getCustomListSearchStringsToRouteIds: once(() => new Map()),
    getPageCommunicator: once(() => ({
      ajaxInterceptStream: this._ajaxInterceptStream,
      setupCustomListResultsQuery: jest.fn(),
      setCustomListNewQuery: jest.fn(value => {
        this._customListNewQueryBus.value(value);
      }),
      setCustomListResults: jest.fn(value => {
        this._customListResultsBus.value(value);
      })
    })),
    signalCustomThreadListActivity: jest.fn(),
    getRfcMessageIdForGmailThreadId: jest.fn(async (gmailThreadId: string) => {
      if (!this._threadIdsToRfcIds.has(gmailThreadId)) {
        throw new Error('Failed to find id');
      }
      return this._threadIdsToRfcIds.get(gmailThreadId);
    }),
    getGmailThreadIdForRfcMessageId: jest.fn(async (rfcId: string) => {
      if (!this._rfcIdsToThreadIds.has(rfcId)) {
        throw new Error('Failed to find id');
      }
      await this._allowGmailThreadIdLookup.take(1).toPromise();
      return this._rfcIdsToThreadIds.get(rfcId);
    })
  };

  _customRouteID = 'tlbeep';
  _routeParams = [];

  _onActivate: Function;
  _expectedSearchQuery: string;
  _start: number;
  _getOriginalSearchResponse: () => Promise<string>;
  _threadIdsToRfcIds: Map<string, string>;
  _rfcIdsToThreadIds: Map<string, string>;

  _newQuery: string;

  constructor(options: {|
    onActivate: Function,
    threadAndRfcIds: Array<[string, string]>,
    expectedSearchQuery: string,
    start: number,
    getOriginalSearchResponse: () => Promise<string>
  |}) {
    this._onActivate = options.onActivate;

    this._threadIdsToRfcIds = new Map(options.threadAndRfcIds);
    this._rfcIdsToThreadIds = new Map(
      options.threadAndRfcIds.map(([threadId, rfcId]) => [rfcId, threadId])
    );

    this._expectedSearchQuery = options.expectedSearchQuery;
    this._start = options.start;
    this._getOriginalSearchResponse = options.getOriginalSearchResponse;
  }

  async runAndGetSetCustomListResults(): Promise<Object> {
    showCustomThreadList(
      this._driver,
      this._customRouteID,
      this._onActivate,
      this._routeParams,
      () => null
    );

    expect(
      this._driver.getPageCommunicator().setupCustomListResultsQuery.mock.calls
        .length
    ).toBe(1);
    this._newQuery = this._driver.getPageCommunicator().setupCustomListResultsQuery.mock.calls[0][0];
    expect(typeof this._newQuery).toBe('string');

    expect(this._driver.getCustomListSearchStringsToRouteIds().size).toBe(1);
    expect(
      this._driver.getCustomListSearchStringsToRouteIds().get(this._newQuery)
    ).toBe('tlbeep');

    expect(this._driver.signalCustomThreadListActivity.mock.calls).toEqual([]);
    expect(
      this._driver.getPageCommunicator().setCustomListNewQuery.mock.calls
    ).toEqual([]);
    this._ajaxInterceptStream.value({
      type: 'searchForReplacement',
      query: this._newQuery,
      start: this._start
    });
    expect(this._driver.signalCustomThreadListActivity.mock.calls).toEqual([
      [this._customRouteID]
    ]);
    await this._customListNewQueryBus.take(1).toPromise();
    expect(
      this._driver.getPageCommunicator().setCustomListNewQuery.mock.calls
    ).toEqual([
      [
        {
          newQuery: this._expectedSearchQuery,
          newStart: 0,
          query: this._newQuery,
          start: this._start
        }
      ]
    ]);

    const originalSearchResponse = await this._getOriginalSearchResponse();

    this._ajaxInterceptStream.value({
      type: 'searchResultsResponse',
      query: this._newQuery,
      start: this._start,
      response: originalSearchResponse
    });

    expect(
      this._driver.getPageCommunicator().setCustomListResults.mock.calls.length
    ).toBe(0);
    this._allowGmailThreadIdLookup.value();
    await this._customListResultsBus.take(1).toPromise();
    expect(
      this._driver.getPageCommunicator().setCustomListResults.mock.calls.length
    ).toBe(1);

    expect(
      this._driver.getPageCommunicator().setCustomListResults.mock.calls[0][0]
    ).toBe(this._newQuery);

    return this._driver.getPageCommunicator().setCustomListResults.mock
      .calls[0][1];
  }
}

test('works', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8'
    )
  );

  const tester = new ShowCustomThreadListTester({
    onActivate() {
      return {
        hasMore: false,
        threads: [
          '168ab8987a3b61b3',
          '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
        ]
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>'
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
      ]
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
    start: 0,
    getOriginalSearchResponse
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreRawResponses(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map(o => ({
      ...o,
      rawResponse: 'ignored'
    }));
  }

  expect(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults)
    )
  ).toEqual(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse())
    )
  );
});

test('can reorder list', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8'
    )
  );

  const tester = new ShowCustomThreadListTester({
    onActivate() {
      return {
        hasMore: false,
        threads: [
          '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
          '168ab8987a3b61b3'
        ]
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>'
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
      ]
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
    start: 0,
    getOriginalSearchResponse
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreSomeFields(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map(o => ({
      ...o,
      rawResponse: 'ignored',
      extraMetaData: {
        ...o.extraMetaData,
        syncMessageData: o.extraMetaData.syncMessageData.map(s => ({
          ...s,
          date: 'ignored'
        }))
      }
    }));
  }

  expect(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults)
    )
  ).toEqual(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse())
    ).reverse()
  );
});

test('missing thread id', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8'
    )
  );

  const tester = new ShowCustomThreadListTester({
    onActivate() {
      return {
        hasMore: false,
        threads: [
          '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
          '168ab8987a3b61b3',
          '1111111111111111',
          '1111111111111112',
          '<a@b.com>'
        ]
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>'
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
      ]
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<a@b.com>',
    start: 0,
    getOriginalSearchResponse
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreSomeFields(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map(o => ({
      ...o,
      rawResponse: 'ignored',
      extraMetaData: {
        ...o.extraMetaData,
        syncMessageData: o.extraMetaData.syncMessageData.map(s => ({
          ...s,
          date: 'ignored'
        }))
      }
    }));
  }

  expect(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults)
    )
  ).toEqual(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse())
    ).reverse()
  );
});

test('missing threads in response', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8'
    )
  );

  const tester = new ShowCustomThreadListTester({
    onActivate() {
      return {
        hasMore: false,
        threads: [
          '168ab8987a3b61b3',
          '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
          '1111111111111111',
          '1111111111111112',
          '<a@b.com>'
        ]
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>'
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
      ],
      ['1111111111111111', '<ones@example.com>'],
      ['1111111111111112', '<onesandatwo@example.com>'],
      ['abab111111111111', '<a@b.com>']
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<ones@example.com> OR rfc822msgid:<onesandatwo@example.com> OR rfc822msgid:<a@b.com>',
    start: 0,
    getOriginalSearchResponse
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreRawResponses(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map(o => ({
      ...o,
      rawResponse: 'ignored'
    }));
  }

  expect(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults)
    )
  ).toEqual(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse())
    )
  );
});
