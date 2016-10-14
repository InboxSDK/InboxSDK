/* @flow */

jest.mock('../views/gmail-route-view/gmail-route-view', () =>
  jest.fn(() => ({destroy(){}}))
);

import _ from 'lodash';
import kefirBus from 'kefir-bus';
import delay from 'pdelay';

import setupRouteViewDriverStream from './setup-route-view-driver-stream';

import GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';
import makeMutationEventInjector from '../../../../../test/lib/makeElementIntoEventEmitter';
import MockMutationObserver from '../../../../../test/lib/mock-mutation-observer';

global.MutationObserver = MockMutationObserver;

document.body.innerHTML = `
  <div class="aeF">
    <div class="nH">
      <div id="main" class="nH"></div>
      <div id="main2" class="nH" style="display:none"></div>
    </div>
  </div>
`;
const main = document.getElementById('main');
const mainEmitter = makeMutationEventInjector(main);
const main2 = document.getElementById('main2');
const main2Emitter = makeMutationEventInjector(main2);

const stopper = kefirBus();
afterEach(() => {
  stopper.emit(null);
});

function makeMockDriver(): Object {
  return {
    getStopper: _.constant(stopper),
    getCustomRouteIDs: _.constant(new Set()),
    getCustomListRouteIDs: _.constant(new Map()),
    getCustomListSearchStringsToRouteIds: _.constant(new Map()),
    hashChangeNoViewChange: jest.fn(),
    showNativeRouteView: jest.fn(),
    showCustomThreadList: jest.fn()
  };
}

test('role=main changes are seen', async () => {
  const items = [];
  window.location.hash = '#inbox';

  setupRouteViewDriverStream(new GmailRouteProcessor(), makeMockDriver())
    .takeUntilBy(stopper)
    .onValue(item => {
      items.push(item);
    });

  await delay(1);
  expect(items.length).toBe(1);

  main.style.display = 'none';
  main2.style.display = '';
  mainEmitter({attributeName: 'style'});
  main2Emitter({attributeName: 'style'});

  await delay(1);
  expect(items.length).toBe(2);

  main.style.display = '';
  main2.style.display = 'none';
  mainEmitter({attributeName: 'style'});
  main2Emitter({attributeName: 'style'});

  await delay(1);
  expect(items.length).toBe(3);
});

test('custom view hashchanges are seen', async () => {
  const items = [];
  const driver = makeMockDriver();
  driver.getCustomRouteIDs().add('foo');
  driver.getCustomRouteIDs().add('bar');
  window.location.hash = '#inbox';

  setupRouteViewDriverStream(new GmailRouteProcessor(), driver)
    .takeUntilBy(stopper)
    .onValue(item => {
      items.push(item);
    });

  await delay(1);
  expect(items.length).toBe(1);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  window.location.hash = '#foo';

  await delay(1);
  expect(items.length).toBe(2);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  window.location.hash = '#foo/123';

  await delay(1);
  expect(items.length).toBe(3);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  // Setting to the same hash should NOT make a new routeview.
  window.location.hash = '#foo/123?compose=123';

  await delay(1);
  expect(items.length).toBe(3);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  window.location.hash = '#bar';

  await delay(1);
  expect(items.length).toBe(4);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);
});

test('native hash changes are ignored', async () => {
  // We don't pay attention to native hash changes usually. We settle for
  // watching a new [role=main] element become displayed.
  const items = [];
  const driver = makeMockDriver();
  window.location.hash = '#inbox';

  setupRouteViewDriverStream(new GmailRouteProcessor(), driver)
    .takeUntilBy(stopper)
    .onValue(item => {
      items.push(item);
    });

  await delay(1);
  expect(items.length).toBe(1);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  window.location.hash = '#starred';

  await delay(1);
  expect(items.length).toBe(1);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);
});

test('revertNativeHashChanges works', async () => {
  const items = [];
  const driver = makeMockDriver();
  driver.getCustomRouteIDs().add('foo');
  window.location.hash = '#inbox';

  setupRouteViewDriverStream(new GmailRouteProcessor(), driver)
    .takeUntilBy(stopper)
    .onValue(item => {
      items.push(item);
    });

  await delay(1);
  expect(items.length).toBe(1);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  window.location.hash = '#foo';

  await delay(1);
  expect(items.length).toBe(2);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(1);

  window.location.hash = '#inbox';

  await delay(1);
  expect(items.length).toBe(3);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(2);

  window.location.hash = '#foo';

  await delay(1);
  expect(items.length).toBe(4);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(2);

  window.location.hash = '#inbox';

  await delay(1);
  expect(items.length).toBe(5);
  expect(driver.showNativeRouteView).toHaveBeenCalledTimes(3);
});
