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

let main: HTMLElement;
let mainEmitter;
let main2: HTMLElement;
let main2Emitter;
beforeEach(() => {
  document.body.innerHTML = `
    <div class="aeF">
      <div class="nH">
        <div id="main" class="nH"></div>
        <div id="main2" class="nH" style="display:none"></div>
      </div>
    </div>
  `;
  main = document.getElementById('main');
  mainEmitter = makeMutationEventInjector(main);
  main2 = document.getElementById('main2');
  main2Emitter = makeMutationEventInjector(main2);
});

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
    showNativeRouteView: jest.fn()
  };
}

test('role=main changes are seen', async () => {
  const items = [];
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
});
