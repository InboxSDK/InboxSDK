import showCustomThreadList, {
  HandlerResult,
  parseOnActivateResult,
} from './show-custom-thread-list';

import * as GSRP from '../gmail-sync-response-processor';

import fs from 'fs';
import once from 'lodash/once';
import kefirBus from 'kefir-bus';
import Logger from '../../../lib/logger';

const readFile = fs.promises.readFile;

beforeAll(() => {
  document.body.innerHTML = `
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
    getLogger: once(() => ({
      error(e: any) {
        console.error(e);
        throw e;
      },
    })),
    getCustomListSearchStringsToRouteIds: once(() => new Map()),
    getPageCommunicator: once(() => ({
      ajaxInterceptStream: this._ajaxInterceptStream,
      setupCustomListResultsQuery: jest.fn(),
      setCustomListNewQuery: jest.fn((value) => {
        this._customListNewQueryBus.value(value);
      }),
      setCustomListResults: jest.fn((value) => {
        this._customListResultsBus.value(value);
      }),
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
    }),
  };

  _customRouteID = 'tlbeep';
  _routeParams = [];

  _onActivate!: Function;
  _expectedSearchQuery!: string;
  _start!: number;
  _getOriginalSearchResponse!: () => Promise<string>;
  _threadIdsToRfcIds!: Map<string, string>;
  _rfcIdsToThreadIds!: Map<string, string>;

  _newQuery!: string;

  constructor(options: {
    onActivate: Function;
    threadAndRfcIds: Array<[string, string]>;
    expectedSearchQuery: string;
    start: number;
    getOriginalSearchResponse: () => Promise<string>;
  }) {
    this._onActivate = options.onActivate;

    this._threadIdsToRfcIds = new Map(options.threadAndRfcIds);
    this._rfcIdsToThreadIds = new Map(
      options.threadAndRfcIds.map(([threadId, rfcId]) => [rfcId, threadId]),
    );

    this._expectedSearchQuery = options.expectedSearchQuery;
    this._start = options.start;
    this._getOriginalSearchResponse = options.getOriginalSearchResponse;
  }

  async runAndGetSetCustomListResults(): Promise<any> {
    showCustomThreadList(
      this._driver,
      this._customRouteID,
      this._onActivate,
      this._routeParams,
      () => null,
    );

    expect(
      this._driver.getPageCommunicator().setupCustomListResultsQuery.mock.calls
        .length,
    ).toBe(1);
    this._newQuery =
      this._driver.getPageCommunicator().setupCustomListResultsQuery.mock.calls[0][0];
    expect(typeof this._newQuery).toBe('string');

    expect(this._driver.getCustomListSearchStringsToRouteIds().size).toBe(1);
    expect(
      this._driver.getCustomListSearchStringsToRouteIds().get(this._newQuery),
    ).toBe('tlbeep');

    expect(this._driver.signalCustomThreadListActivity.mock.calls).toEqual([]);
    expect(
      this._driver.getPageCommunicator().setCustomListNewQuery.mock.calls,
    ).toEqual([]);
    this._ajaxInterceptStream.value({
      type: 'searchForReplacement',
      query: this._newQuery,
      start: this._start,
    });
    expect(this._driver.signalCustomThreadListActivity.mock.calls).toEqual([
      [this._customRouteID],
    ]);
    await this._customListNewQueryBus.take(1).toPromise();
    expect(
      this._driver.getPageCommunicator().setCustomListNewQuery.mock.calls,
    ).toEqual([
      [
        {
          newQuery: this._expectedSearchQuery,
          newStart: 0,
          query: this._newQuery,
          start: this._start,
        },
      ],
    ]);

    const originalSearchResponse = await this._getOriginalSearchResponse();

    this._ajaxInterceptStream.value({
      type: 'searchResultsResponse',
      query: this._newQuery,
      start: this._start,
      response: originalSearchResponse,
    });

    expect(
      this._driver.getPageCommunicator().setCustomListResults.mock.calls.length,
    ).toBe(0);
    (this._allowGmailThreadIdLookup as any).value();
    await this._customListResultsBus.take(1).toPromise();
    expect(
      this._driver.getPageCommunicator().setCustomListResults.mock.calls.length,
    ).toBe(1);

    expect(
      this._driver.getPageCommunicator().setCustomListResults.mock.calls[0][0],
    ).toBe(this._newQuery);

    return this._driver.getPageCommunicator().setCustomListResults.mock
      .calls[0][1];
  }
}

test('works', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8',
    ),
  );

  const tester = new ShowCustomThreadListTester({
    onActivate() {
      return {
        hasMore: false,
        threads: [
          '168ab8987a3b61b3',
          '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
        ],
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
      ],
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
    start: 0,
    getOriginalSearchResponse,
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreRawResponses(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map((o) => ({
      ...o,
      rawResponse: 'ignored',
    }));
  }

  expect(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults),
    ),
  ).toEqual(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse()),
    ),
  );
});

test('can reorder list', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8',
    ),
  );

  const tester = new ShowCustomThreadListTester({
    onActivate() {
      return {
        hasMore: false,
        threads: [
          '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
          '168ab8987a3b61b3',
        ],
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
      ],
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
    start: 0,
    getOriginalSearchResponse,
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreSomeFields(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map((o) => ({
      ...o,
      rawResponse: 'ignored',
      extraMetaData: {
        ...o.extraMetaData,
        syncMessageData: o.extraMetaData.syncMessageData.map((s) => ({
          ...s,
          date: 'ignored',
        })),
      },
    }));
  }

  expect(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults),
    ),
  ).toEqual(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse()),
    ).reverse(),
  );
});

test('missing thread id', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8',
    ),
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
          '<a@b.com>',
        ],
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
      ],
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<a@b.com>',
    start: 0,
    getOriginalSearchResponse,
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreSomeFields(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map((o) => ({
      ...o,
      rawResponse: 'ignored',
      extraMetaData: {
        ...o.extraMetaData,
        syncMessageData: o.extraMetaData.syncMessageData.map((s) => ({
          ...s,
          date: 'ignored',
        })),
      },
    }));
  }

  expect(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults),
    ),
  ).toEqual(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse()),
    ).reverse(),
  );
});

test('missing threads in response', async () => {
  const getOriginalSearchResponse = once(() =>
    readFile(
      __dirname + '/../../../../../test/data/2019-02-01 search results.json',
      'utf8',
    ),
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
          '<a@b.com>',
        ],
      };
    },
    threadAndRfcIds: [
      [
        '168ab8987a3b61b3',
        '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
      ],
      [
        '168a6018f86576ac',
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
      ],
      ['1111111111111111', '<ones@example.com>'],
      ['1111111111111112', '<onesandatwo@example.com>'],
      ['abab111111111111', '<a@b.com>'],
    ],
    expectedSearchQuery:
      'rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<ones@example.com> OR rfc822msgid:<onesandatwo@example.com> OR rfc822msgid:<a@b.com>',
    start: 0,
    getOriginalSearchResponse,
  });
  const setCustomListResults = await tester.runAndGetSetCustomListResults();

  function ignoreRawResponses(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map((o) => ({
      ...o,
      rawResponse: 'ignored',
    }));
  }

  expect(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(setCustomListResults),
    ),
  ).toEqual(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(await getOriginalSearchResponse()),
    ),
  );
});

describe('parseOnActivateResult', () => {
  const fakeLogger = {
    deprecationWarning: (..._) => {},
    error: (..._) => {},
  } as Logger;
  test("should default to one page since arrays can't be paginated when provided with a results array", () => {
    const result = [
      'id1',
      {
        gmailThreadId: 'gmailThread1',
      },
      {
        rfcMessageId: 'rfcMessageId',
      },
    ];
    const fnResult = parseOnActivateResult(fakeLogger, 0, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      // default to one page since arrays can't be paginated
      total: result.length,
      threads: result,
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should throw if result.threads is not an array', () => {
    const result = { total: 10, hasMore: false, threads: {} } as HandlerResult;
    const expectedError =
      'handleCustomListRoute result must contain a "threads" array ' +
      '(https://www.inboxsdk.com/docs/#Router).';

    expect(() => parseOnActivateResult(fakeLogger, 0, result)).toThrowError(
      expectedError,
    );
  });
  test('should throw if BOTH `hasMore` and `total` have values', () => {
    let result: HandlerResult = { total: 10, hasMore: true, threads: [] };
    const expectedError =
      'handleCustomListRoute result must only contain either a "total" or a "hasMore" property, but not both. (https://www.inboxsdk.com/docs/#Router).';

    expect(() => parseOnActivateResult(fakeLogger, 0, result)).toThrowError(
      expectedError,
    );
  });
  test('should NOT throw if only one of `hasMore` or `total` have values', () => {
    let result: HandlerResult = { total: 10, threads: [] };
    const unExpectedError =
      'handleCustomListRoute result must only contain either a "total" or a "hasMore" property, but not both. (https://www.inboxsdk.com/docs/#Router).';

    expect(() => parseOnActivateResult(fakeLogger, 0, result)).not.toThrowError(
      unExpectedError,
    );
    result = { hasMore: true, threads: [] };
    expect(() => parseOnActivateResult(fakeLogger, 0, result)).not.toThrowError(
      unExpectedError,
    );
  });

  test('should correctly parse onActivate result when only total exists', () => {
    const resultTotal = 10;
    let result: HandlerResult = {
      total: resultTotal,
      threads: [
        'id1',
        {
          gmailThreadId: 'gmailThread1',
        },
        {
          rfcMessageId: 'rfcMessageId',
        },
      ],
    };

    const fnResult = parseOnActivateResult(fakeLogger, 0, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      total: resultTotal,
      threads: result.threads,
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should correctly parse and limit onActivate result when only total exists and result threads are over 50', () => {
    const resultTotal = 150;
    let result: HandlerResult = {
      total: resultTotal,
      threads: [],
    };
    // Add 3 * 50 threads
    for (let i = 0; i < 50; i++) {
      result.threads = [
        ...result.threads,
        'id1',
        {
          gmailThreadId: 'gmailThread1',
        },
        {
          rfcMessageId: 'rfcMessageId',
        },
      ];
    }

    const fnResult = parseOnActivateResult(fakeLogger, 0, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      total: resultTotal,
      threads: result.threads.slice(0, 50),
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should correctly parse onActivate result when only hasMore is true', () => {
    let result: HandlerResult = {
      hasMore: true,
      threads: [],
    };
    // Add 2 * 25 = 50 threads (the max)
    for (let i = 0; i < 25; i++) {
      result.threads = [
        ...result.threads,
        'id1',
        {
          gmailThreadId: 'gmailThread1',
        },
      ];
    }

    const fnResult = parseOnActivateResult(fakeLogger, 0, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      total: 'MANY',
      threads: result.threads,
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should correctly parse onActivate result when only hasMore is true and threads are > than MAX', () => {
    let result: HandlerResult = {
      hasMore: true,
      threads: [],
    };
    // Add 3 * 25 = 75 threads (greater than the max)
    for (let i = 0; i < 25; i++) {
      result.threads = [
        ...result.threads,
        'id1',
        {
          gmailThreadId: 'gmailThread1',
        },
        {
          rfcMessageId: 'rfcMessageId',
        },
      ];
    }

    const fnResult = parseOnActivateResult(fakeLogger, 0, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      total: 'MANY',
      threads: result.threads.slice(0, 50),
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should correctly parse onActivate result when only hasMore is false', () => {
    let result: HandlerResult = {
      hasMore: false,
      threads: [],
    };
    // Add 2 * 25 = 50 threads (the max)
    for (let i = 0; i < 25; i++) {
      result.threads = [
        ...result.threads,
        'id1',
        {
          gmailThreadId: 'gmailThread1',
        },
      ];
    }

    const fnResult = parseOnActivateResult(fakeLogger, 20, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      total: 20 + 50,
      threads: result.threads,
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should correctly parse onActivate result when only hasMore is false and threads are > than MAX', () => {
    let result: HandlerResult = {
      hasMore: false,
      threads: [],
    };
    // Add 3 * 25 = 75 threads (greater than the max)
    for (let i = 0; i < 25; i++) {
      result.threads = [
        ...result.threads,
        'id1',
        {
          gmailThreadId: 'gmailThread1',
        },
        {
          rfcMessageId: 'rfcMessageId',
        },
      ];
    }

    const fnResult = parseOnActivateResult(fakeLogger, 10, result);
    const expected: ReturnType<typeof parseOnActivateResult> = {
      total: 10 + result.threads.slice(0, 50).length,
      threads: result.threads.slice(0, 50),
    };
    expect(fnResult).toStrictEqual(expected);
  });
  test('should throw correct error when neither `total` nor `hasMore` are as expected', () => {
    const expectedError =
      'handleCustomListRoute result must contain either a "total" number ' +
      'or a "hasMore" boolean (https://www.inboxsdk.com/docs/#Router).';
    const result = {
      total: 'MANY',
      hasMore: 'yup',
      threads: [],
    } as unknown as HandlerResult;
    expect(() => parseOnActivateResult(fakeLogger, 1000, result)).toThrowError(
      expectedError,
    );
  });
  test('should throw the correct error if result is not the correct type', () => {
    const expectedError =
      'handleCustomListRoute result must be an array or an object ' +
      '(https://www.inboxsdk.com/docs/#Router).';
    expect(() =>
      parseOnActivateResult(fakeLogger, 1000, 20 as any),
    ).toThrowError(expectedError);
    // Bad object
    const expectedErrorForBadObject =
      'handleCustomListRoute result must contain a "threads" array (https://www.inboxsdk.com/docs/#Router).';
    expect(() =>
      parseOnActivateResult(
        fakeLogger,
        1000,
        new Error('What is going on???') as any,
      ),
    ).toThrowError(expectedErrorForBadObject);

    const result = { incorrect: true, name: 'Bad object' };
    expect(() =>
      parseOnActivateResult(fakeLogger, 1000, result as any),
    ).toThrowError(expectedErrorForBadObject);
  });
});
