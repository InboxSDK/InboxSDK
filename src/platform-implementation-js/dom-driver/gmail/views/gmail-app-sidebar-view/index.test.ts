jest.mock('../../../../lib/idMap', () => {
  function idMap(key: string) {
    const legacyMapping: Record<string, string> = {
      app_sidebar_content_panel: 'bccbBAHIcfEeHCHf',
    };
    return legacyMapping[key] ?? key;
  }

  return {
    __esModule: true,
    default: idMap,
    legacyIdMap: idMap,
  };
});
import idMap from '../../../../lib/idMap';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import delay from 'pdelay';
import GmailAppSidebarView from './index';
import MockWebStorage from 'mock-webstorage';
import GmailThreadView from '../gmail-thread-view';

jest.mock('../../../../lib/dom/make-element-child-stream', () => {
  return () => require('kefir-bus')();
});
jest.mock('../../../../lib/dom/make-mutation-observer-chunked-stream', () => {
  return () => require('kefir-bus')();
});

global.localStorage = new MockWebStorage();
(global as any)._APP_SIDEBAR_TEST = true;
describe('GmailAppSidebarView Primary', function () {
  beforeEach(() => {
    makeSidebarContainerElement();
  });
  afterEach(() => {
    removeSidebarContainerElement();
  });
  it('construction works', () => {
    const gmailAppSidebarView = new GmailAppSidebarView(
      makeDriver(),
      makeContentContainerElement()
    );
  });
  it('sidebar is added', async () => {
    const container = makeContentContainerElement();
    const gmailAppSidebarView = new GmailAppSidebarView(
      makeDriver(),
      container
    );
    const descriptor = Kefir.constant({
      title: 'foo',
      iconUrl: '/bar.png',
      el: document.createElement('div'),
    });
    const fakeThreadView = {
      getStopper: _.constant(kefirStopper()),
    } as GmailThreadView;
    const panel = gmailAppSidebarView.addThreadSidebarContentPanel(
      descriptor,
      fakeThreadView
    );
    await delay(0);
    expect(
      container.querySelectorAll('.' + idMap('app_sidebar_content_panel'))
        .length
    ).toBe(1);
    panel.remove();
    expect(
      container.querySelectorAll('.' + idMap('app_sidebar_content_panel'))
        .length
    ).toBe(0);
  });
  it('multiple sidebars can be added', async () => {
    const container = makeContentContainerElement();
    const gmailAppSidebarView = new GmailAppSidebarView(
      makeDriver(),
      container
    );
    const descriptor1 = Kefir.constant({
      title: 'foo1',
      iconUrl: '/bar.png',
      el: document.createElement('div'),
    });
    const descriptor2 = Kefir.constant({
      title: 'foo2',
      iconUrl: '/bar.png',
      el: document.createElement('div'),
    });
    const fakeThreadView = {
      getStopper: _.constant(kefirStopper()),
    } as GmailThreadView;
    gmailAppSidebarView.addThreadSidebarContentPanel(
      descriptor1,
      fakeThreadView
    );
    gmailAppSidebarView.addThreadSidebarContentPanel(
      descriptor2,
      fakeThreadView
    );
    await delay(0);
    expect(
      container.querySelectorAll('.' + idMap('app_sidebar_content_panel'))
        .length
    ).toBe(2);
  });
});

function makeDriver(appId?: string, opts?: any): any {
  return {
    getAppId: () => appId || 'test',
    getOpts: () =>
      opts || {
        appName: 'Test',
        appIconUrl: 'testImage.png',
      },

    getLogger() {
      return {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        eventSdkPassive() {},

        error(err: unknown, details: unknown) {
          console.error('logger.error called:', err, details);
          throw err;
        },
      };
    },
  };
}

function makeSidebarContainerElement() {
  const newDiv = document.createElement('div');
  newDiv.className = 'brC-aT5-aOt-Jw';
  const sidebar = document.createElement('div');
  sidebar.className = 'J-KU-Jg';
  sidebar.setAttribute('role', 'tablist');
  const separator = document.createElement('div');
  separator.setAttribute('role', 'separator');
  sidebar.appendChild(separator);
  newDiv.appendChild(sidebar);
  document.body && document.body.appendChild(newDiv);
}

function removeSidebarContainerElement() {
  const oldDivs = Array.from(document.getElementsByClassName('brC-aT5-aOt-Jw'));
  oldDivs.forEach((oldDiv) => {
    const parent = oldDiv.parentNode;
    parent && parent.removeChild(oldDiv);
  });
}

function makeContentContainerElement() {
  const contentContainerElement = document.createElement('div');
  contentContainerElement.className = 'bq9';
  return contentContainerElement;
}
