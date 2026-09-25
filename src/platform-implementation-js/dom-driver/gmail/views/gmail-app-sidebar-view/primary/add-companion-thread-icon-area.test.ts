jest.mock('../../../../../lib/idMap', () => {
  function idMap(key: string) {
    return key;
  }

  return {
    __esModule: true,
    default: idMap,
    legacyIdMap: idMap,
  };
});
jest.mock('../../../../../lib/dom/make-element-child-stream', () => {
  return () => require('kefir-bus')();
});
jest.mock(
  '../../../../../lib/dom/make-mutation-observer-chunked-stream',
  () => {
    return () => require('kefir-bus')();
  },
);
import _ from 'lodash';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import delay from 'pdelay';
import MockWebStorage from 'mock-webstorage';
import GmailAppSidebarView from '../index';
import GmailAppSidebarPrimary from './index';
import GmailThreadView from '../../gmail-thread-view';
import ContentPanelViewDriver, {
  type ContentPanelDescriptor,
} from '../../../../../driver-common/sidebar/ContentPanelViewDriver';
import waitFor, { WaitForError } from '../../../../../lib/wait-for';

// https://github.com/jestjs/jest/issues/2098#issuecomment-260733457
Object.defineProperty(globalThis, 'localStorage', {
  value: new MockWebStorage(),
});
(global as any)._APP_SIDEBAR_TEST = true;

describe('addCompanionThreadIconArea', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('inserts the icon area after the separator when the tablist is present', async () => {
    const { container, tabList } = makeSidebarContainerElement();
    const separator = tabList.querySelector('[role=separator]')!;
    const view = new GmailAppSidebarView(
      makeDriver(),
      makeContentContainerElement(),
    );

    addThreadPanel(view);
    await delay(0);

    const iconAreas = container.querySelectorAll('.sidebar_thread_iconArea');
    expect(iconAreas.length).toBe(1);
    expect(iconAreas[0].parentElement).toBe(tabList);
    expect(separator.nextElementSibling).toBe(iconAreas[0]);
    expect(
      iconAreas[0].querySelectorAll('button.inboxsdk__button_icon').length,
    ).toBe(1);
  });

  it('adds a single icon area when two panels are added back-to-back', async () => {
    const { container } = makeSidebarContainerElement();
    const view = new GmailAppSidebarView(
      makeDriver(),
      makeContentContainerElement(),
    );

    addThreadPanel(view, 'App1');
    addThreadPanel(view, 'App2');
    await waitFor(
      () => container.querySelector('.sidebar_thread_iconArea'),
      1000,
      10,
    );
    // Give a duplicate insertion scheduled during the same tick time to land.
    await delay(20);

    const iconAreas = container.querySelectorAll('.sidebar_thread_iconArea');
    expect(iconAreas.length).toBe(1);
    expect(
      iconAreas[0].querySelectorAll('.sidebar_button_container').length,
    ).toBe(2);
  });

  it('waits for the tablist to appear before inserting the icon area (#1287)', async () => {
    const { container, tabList } = makeSidebarContainerElement({
      tablistReady: false,
    });
    const view = new GmailAppSidebarView(
      makeDriver(),
      makeContentContainerElement(),
    );

    addThreadPanel(view);
    await delay(0);
    expect(container.querySelectorAll('.sidebar_thread_iconArea').length).toBe(
      0,
    );

    tabList.setAttribute('role', 'tablist');
    await waitFor(
      () => container.querySelector('.sidebar_thread_iconArea'),
      2000,
      10,
    );

    const iconAreas = container.querySelectorAll('.sidebar_thread_iconArea');
    expect(iconAreas.length).toBe(1);
    expect(iconAreas[0].parentElement).toBe(tabList);
    expect(
      iconAreas[0].querySelectorAll('button.inboxsdk__button_icon').length,
    ).toBe(1);
  });

  it('reuses the pending icon area for panels added while waiting for the tablist', async () => {
    const { container, tabList } = makeSidebarContainerElement({
      tablistReady: false,
    });
    const view = new GmailAppSidebarView(
      makeDriver(),
      makeContentContainerElement(),
    );

    addThreadPanel(view, 'App1');
    addThreadPanel(view, 'App2');
    await delay(0);
    expect(container.querySelectorAll('.sidebar_thread_iconArea').length).toBe(
      0,
    );

    tabList.setAttribute('role', 'tablist');
    await waitFor(
      () => container.querySelector('.sidebar_thread_iconArea'),
      2000,
      10,
    );
    // Give a duplicate insertion scheduled during the same tick time to land.
    await delay(20);

    const iconAreas = container.querySelectorAll('.sidebar_thread_iconArea');
    expect(iconAreas.length).toBe(1);
    expect(
      iconAreas[0].querySelectorAll('.sidebar_button_container').length,
    ).toBe(2);
  });

  it('logs the timeout and inserts nothing when the tablist never appears', async () => {
    jest.useFakeTimers();

    try {
      makeSidebarContainerElement({ tablistReady: false });
      const errors: Array<{ err: unknown; details: unknown }> = [];
      const view = new GmailAppSidebarView(
        makeDriver((err, details) => errors.push({ err, details })),
        makeContentContainerElement(),
      );

      addThreadPanel(view);
      // addCompanionThreadIconArea waits up to 5 seconds for the tablist.
      await jest.advanceTimersByTimeAsync(6000);

      expect(errors.length).toBe(1);
      expect(errors[0].err).toBeInstanceOf(WaitForError);
      expect(errors[0].details).toBe('addCompanionThreadIconArea: no tablist');
      expect(document.querySelectorAll('.sidebar_thread_iconArea').length).toBe(
        0,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not insert the icon area when the primary is destroyed while waiting', async () => {
    const { tabList } = makeSidebarContainerElement({ tablistReady: false });
    const errors: unknown[] = [];
    const driver = makeDriver((err) => errors.push(err));
    const primary = new GmailAppSidebarPrimary(
      driver,
      makeContentContainerElement(),
    );

    const descriptor = Kefir.constant({
      title: 'foo',
      iconUrl: '/bar.png',
      el: document.createElement('div'),
    } as unknown as ContentPanelDescriptor);
    new ContentPanelViewDriver(driver, descriptor, primary.getInstanceId());
    await delay(0);

    primary.destroy();
    tabList.setAttribute('role', 'tablist');
    // addCompanionThreadIconArea polls every 250ms; wait past one full
    // interval to verify no insertion happens after destroy.
    await delay(300);

    expect(document.querySelectorAll('.sidebar_thread_iconArea').length).toBe(
      0,
    );
    expect(errors).toEqual([]);
  });
});

function makeDriver(onError?: (err: unknown, details?: unknown) => void): any {
  return {
    getAppId: () => 'test',
    getOpts: () => ({
      appName: 'Test',
      appIconUrl: 'testImage.png',
    }),

    getLogger() {
      return {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        eventSdkPassive() {},

        error(err: unknown, details?: unknown) {
          if (onError) {
            onError(err, details);
          } else {
            console.error('logger.error called:', err, details);
            throw err;
          }
        },
      };
    },
  };
}

/**
 * Builds the same structure as Gmail's companion sidebar icon container. With
 * `tablistReady: false`, the tablist element matches neither `[role=tablist]`
 * nor the `.J-KU-Jg` fallback selector yet, like when the SDK loads on an
 * already-open conversation before Gmail finishes setting up the sidebar
 * (#1287).
 */
function makeSidebarContainerElement({ tablistReady = true } = {}) {
  const container = document.createElement('div');
  container.className = 'brC-aT5-aOt-Jw';
  const tabList = document.createElement('div');

  if (tablistReady) {
    tabList.className = 'J-KU-Jg';
    tabList.setAttribute('role', 'tablist');
  }

  const separator = document.createElement('div');
  separator.setAttribute('role', 'separator');
  tabList.appendChild(separator);
  container.appendChild(tabList);
  document.body.appendChild(container);
  return { container, tabList };
}

function makeContentContainerElement() {
  const contentContainerElement = document.createElement('div');
  contentContainerElement.className = 'bq9';
  return contentContainerElement;
}

function addThreadPanel(view: GmailAppSidebarView, appName?: string) {
  const descriptor = Kefir.constant({
    appName,
    title: 'foo',
    iconUrl: '/bar.png',
    el: document.createElement('div'),
  } as unknown as ContentPanelDescriptor);
  const fakeThreadView = {
    getStopper: _.constant(kefirStopper()),
  } as GmailThreadView;
  return view.addThreadSidebarContentPanel(descriptor, fakeThreadView);
}
