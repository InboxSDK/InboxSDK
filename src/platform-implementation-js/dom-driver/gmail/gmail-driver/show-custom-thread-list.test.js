/* @flow */

import showCustomThreadList from './show-custom-thread-list';

import * as GSRP from '../gmail-sync-response-processor';

import fs from 'fs';
import once from 'lodash/once';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

const readFile = (fs.promises.readFile: Function);

beforeAll(() => {
  (document.body: any).innerHTML = `
  <div>
    <form role="search">
      <input type="text">
    </form>
  </div>
`;
});

test('works', async () => {
  const ajaxInterceptStream = kefirBus();
  const customListNewQueryBus = kefirBus();
  const customListResultsBus = kefirBus();
  const allowGmailThreadIdLookup = kefirBus();
  const driver: any = {
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
      ajaxInterceptStream,
      setupCustomListResultsQuery: jest.fn(),
      setCustomListNewQuery: jest.fn(value =>
        customListNewQueryBus.value(value)
      ),
      setCustomListResults: jest.fn(value => customListResultsBus.value(value))
    })),
    signalCustomThreadListActivity: jest.fn(),
    getRfcMessageIdForGmailThreadId: jest.fn(async (gmailThreadId: string) => {
      expect(gmailThreadId).toBe('168ab8987a3b61b3');
      return '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>';
    }),
    getGmailThreadIdForRfcMessageId: jest.fn(async (rfcId: string) => {
      expect(rfcId).toBe(
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
      );
      await allowGmailThreadIdLookup.take(1).toPromise();
      return '168a6018f86576ac';
    })
  };
  const onActivate = jest.fn(() => ({
    hasMore: false,
    threads: [
      '168ab8987a3b61b3',
      '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
    ]
  }));

  showCustomThreadList(driver, 'tlbeep', onActivate, []);

  expect(
    driver.getPageCommunicator().setupCustomListResultsQuery.mock.calls.length
  ).toBe(1);
  const newQuery = driver.getPageCommunicator().setupCustomListResultsQuery.mock
    .calls[0][0];
  expect(typeof newQuery).toBe('string');

  expect(driver.getCustomListSearchStringsToRouteIds().size).toBe(1);
  expect(driver.getCustomListSearchStringsToRouteIds().get(newQuery)).toBe(
    'tlbeep'
  );

  expect(driver.signalCustomThreadListActivity.mock.calls).toEqual([]);
  expect(driver.getPageCommunicator().setCustomListNewQuery.mock.calls).toEqual(
    []
  );
  ajaxInterceptStream.value({
    type: 'searchForReplacement',
    query: newQuery,
    start: 0
  });
  expect(driver.signalCustomThreadListActivity.mock.calls).toEqual([
    ['tlbeep']
  ]);
  await customListNewQueryBus.take(1).toPromise();
  expect(driver.getPageCommunicator().setCustomListNewQuery.mock.calls).toEqual(
    [
      [
        {
          newQuery:
            'rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com> OR rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
          newStart: 0,
          query: newQuery,
          start: 0
        }
      ]
    ]
  );

  const originalSearchResponse = await readFile(
    __dirname + '/../../../../../test/data/2019-02-01 search results.json',
    'utf8'
  );

  ajaxInterceptStream.value({
    type: 'searchResultsResponse',
    query: newQuery,
    start: 0,
    response: originalSearchResponse
  });

  expect(
    driver.getPageCommunicator().setCustomListResults.mock.calls.length
  ).toBe(0);
  allowGmailThreadIdLookup.value();
  await customListResultsBus.take(1).toPromise();
  expect(
    driver.getPageCommunicator().setCustomListResults.mock.calls.length
  ).toBe(1);

  expect(
    driver.getPageCommunicator().setCustomListResults.mock.calls[0][0]
  ).toBe(newQuery);

  function ignoreRawResponses(syncThreads: GSRP.SyncThread[]) {
    return syncThreads.map(o => ({
      ...o,
      rawResponse: 'ignored'
    }));
  }

  expect(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(
        driver.getPageCommunicator().setCustomListResults.mock.calls[0][1]
      )
    )
  ).toEqual(
    ignoreRawResponses(
      GSRP.extractThreadsFromSearchResponse(originalSearchResponse)
    )
  );
});

test('can reorder list', async () => {
  const ajaxInterceptStream = kefirBus();
  const customListNewQueryBus = kefirBus();
  const customListResultsBus = kefirBus();
  const allowGmailThreadIdLookup = kefirBus();
  const driver: any = {
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
      ajaxInterceptStream,
      setupCustomListResultsQuery: jest.fn(),
      setCustomListNewQuery: jest.fn(value =>
        customListNewQueryBus.value(value)
      ),
      setCustomListResults: jest.fn(value => customListResultsBus.value(value))
    })),
    signalCustomThreadListActivity: jest.fn(),
    getRfcMessageIdForGmailThreadId: jest.fn(async (gmailThreadId: string) => {
      expect(gmailThreadId).toBe('168ab8987a3b61b3');
      return '<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>';
    }),
    getGmailThreadIdForRfcMessageId: jest.fn(async (rfcId: string) => {
      expect(rfcId).toBe(
        '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>'
      );
      await allowGmailThreadIdLookup.take(1).toPromise();
      return '168a6018f86576ac';
    })
  };
  const onActivate = jest.fn(() => ({
    hasMore: false,
    threads: [
      '<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com>',
      '168ab8987a3b61b3'
    ]
  }));

  showCustomThreadList(driver, 'tlbeep', onActivate, []);

  expect(
    driver.getPageCommunicator().setupCustomListResultsQuery.mock.calls.length
  ).toBe(1);
  const newQuery = driver.getPageCommunicator().setupCustomListResultsQuery.mock
    .calls[0][0];
  expect(typeof newQuery).toBe('string');

  expect(driver.getCustomListSearchStringsToRouteIds().size).toBe(1);
  expect(driver.getCustomListSearchStringsToRouteIds().get(newQuery)).toBe(
    'tlbeep'
  );

  expect(driver.signalCustomThreadListActivity.mock.calls).toEqual([]);
  expect(driver.getPageCommunicator().setCustomListNewQuery.mock.calls).toEqual(
    []
  );
  ajaxInterceptStream.value({
    type: 'searchForReplacement',
    query: newQuery,
    start: 0
  });
  expect(driver.signalCustomThreadListActivity.mock.calls).toEqual([
    ['tlbeep']
  ]);
  await customListNewQueryBus.take(1).toPromise();
  expect(driver.getPageCommunicator().setCustomListNewQuery.mock.calls).toEqual(
    [
      [
        {
          newQuery:
            'rfc822msgid:<CAL_Ays8e-3FpHxkJ8qWNXKMHKnysR2XTeSakv_yvQNUjZsSSdw@mail.gmail.com> OR rfc822msgid:<CAL_Ays_RcwA0U8-43zY8JYPRsyQ5EOavXjrYZx7=EqVTx9Jz3g@mail.gmail.com>',
          newStart: 0,
          query: newQuery,
          start: 0
        }
      ]
    ]
  );

  const originalSearchResponse = await readFile(
    __dirname + '/../../../../../test/data/2019-02-01 search results.json',
    'utf8'
  );

  ajaxInterceptStream.value({
    type: 'searchResultsResponse',
    query: newQuery,
    start: 0,
    response: originalSearchResponse
  });

  expect(
    driver.getPageCommunicator().setCustomListResults.mock.calls.length
  ).toBe(0);
  allowGmailThreadIdLookup.value();
  await customListResultsBus.take(1).toPromise();
  expect(
    driver.getPageCommunicator().setCustomListResults.mock.calls.length
  ).toBe(1);

  expect(
    driver.getPageCommunicator().setCustomListResults.mock.calls[0][0]
  ).toBe(newQuery);

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
      GSRP.extractThreadsFromSearchResponse(
        driver.getPageCommunicator().setCustomListResults.mock.calls[0][1]
      )
    )
  ).toEqual(
    ignoreSomeFields(
      GSRP.extractThreadsFromSearchResponse(originalSearchResponse)
    ).reverse()
  );
});
