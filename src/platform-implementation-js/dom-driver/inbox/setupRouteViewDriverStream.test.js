/* @flow */

jest.mock('./getSidebarClassnames');

import _ from 'lodash';
import delay from 'pdelay';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import InboxRouteView from './views/inbox-route-view';
import InboxCustomRouteView from './views/inbox-custom-route-view';
import InboxDummyRouteView from './views/inbox-dummy-route-view';

import setupRouteViewDriverStream from './setupRouteViewDriverStream';

const stopper = kefirBus();
afterEach(() => {
  stopper.emit(null);
});

function makeMockDriver(): Object {
  return {
    getStopper: _.constant(stopper),
    getCustomRouteIDs: _.constant(new Set()),
    showNativeRouteView: jest.fn(),
  };
}

test('test', async () => {
  const items = [];
  const driver = makeMockDriver();
  driver.getCustomRouteIDs().add('foo');
  setupRouteViewDriverStream(driver)
    .takeUntilBy(stopper)
    .onValue(item => {
      items.push(item);
    });

  expect(items.length).toBe(1);
  expect(items[0]).toBeInstanceOf(InboxDummyRouteView);

  const firstStopper = jest.fn();
  items[0].getStopper().onValue(firstStopper);
  expect(firstStopper).toHaveBeenCalledTimes(0);

  document.dispatchEvent(new CustomEvent('inboxSDKpushState', {
    bubbles: false, cancelable: false,
    detail: {
      __test_url: 'https://inbox.google.com/u/0/snoozed',
      args: ["%5B1%2C%5B%5B11%2C0%2Cfalse%2Cnull%2Cnull%2C0%5D%5D%5D", "", "/u/0/snoozed"]
    }
  }));

  expect(items.length).toBe(2);
  expect(items[1]).toBeInstanceOf(InboxDummyRouteView);
  expect(firstStopper).toHaveBeenCalledTimes(1);

  document.location.hash = '#foo';
  await delay(1);
  expect(items.length).toBe(3);
  expect(items[2]).toBeInstanceOf(InboxCustomRouteView);

  document.dispatchEvent(new CustomEvent('inboxSDKpushState', {
    bubbles: false, cancelable: false,
    detail: {
      __test_url: 'https://inbox.google.com/u/0/done',
      args: ["%5B1%2C%5B%5B2%2C0%2Cfalse%2Cnull%2Cnull%2C0%5D%5D%5D", "", "/u/0/done"]
    }
  }));

  expect(items.length).toBe(4);
  expect(items[3]).toBeInstanceOf(InboxDummyRouteView);
});
