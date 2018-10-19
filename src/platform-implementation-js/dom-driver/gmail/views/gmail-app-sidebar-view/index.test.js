/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delay from 'pdelay';
import fs from 'fs';
import idMap from '../../../../lib/idMap';
import GmailThreadSidebarView from '../gmail-thread-sidebar-view';
import ContentPanelViewDriver from '../../../../driver-common/sidebar/ContentPanelViewDriver';
import GmailElementGetter from '../../gmail-element-getter';
import MockWebStorage from 'mock-webstorage';

const mockKefirBus = kefirBus;

jest.mock('../../../../lib/dom/make-element-child-stream', () => {
  return () => mockKefirBus();
});

jest.mock('../../../../lib/dom/make-mutation-observer-chunked-stream', () => {
  return () => mockKefirBus();
});

global.localStorage = new MockWebStorage();
global._APP_SIDEBAR_TEST = true;

(Element: any).prototype.insertAdjacentElement = function(position, el) {
  switch (position) {
    case 'beforebegin':
      this.parentElement.insertBefore(el, this);
      break;
    case 'afterbegin':
      this.insertBefore(el, this.firstElementChild);
      break;
    case 'beforeend':
      this.appendChild(el);
      break;
    case 'afterend':
      this.parentElement.insertBefore(el, this);
      this.parentElement.insertBefore(this, el);
      break;
  }
};

describe('Without add-ons', function() {
  it('construction works', () => {
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div')
    );
  });

  it('sidebar is added', async () => {
    const container = document.createElement('div');
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      container
    );

    const panel = gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
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
    const container = document.createElement('div');
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      container
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo1',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo2',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    await delay(0);
    expect(
      container.querySelectorAll('.' + idMap('app_sidebar_content_panel'))
        .length
    ).toBe(2);
  });
});

describe('With new add-ons html', function() {
  it('construction works', () => {
    const sidebarContainer = makeAddonSidebarWithV2HTML();
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div'),
      sidebarContainer
    );
  });

  it('sidebar is added', async () => {
    const sidebarContainer = makeAddonSidebarWithV2HTML();
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div'),
      sidebarContainer
    );

    const panel = gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    await delay(0);
    expect(
      sidebarContainer.querySelectorAll(
        '.' + idMap('app_sidebar_content_panel')
      ).length
    ).toBe(1);
    expect(
      sidebarContainer.querySelectorAll('.' + idMap('sidebar_button_container'))
        .length
    ).toBe(1);

    panel.remove();
    expect(
      sidebarContainer.querySelectorAll(
        '.' + idMap('app_sidebar_content_panel')
      ).length
    ).toBe(0);
    expect(
      sidebarContainer.querySelectorAll('.' + idMap('sidebar_button_container'))
        .length
    ).toBe(0);
  });

  it('icons get grouped by appName', async () => {
    const sidebarContainer = makeAddonSidebarWithV2HTML();
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div'),
      sidebarContainer
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        appName: 'foo',
        title: 'foo 1',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        appName: 'foo',
        title: 'foo 2',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        appName: 'bar',
        title: 'bar 2',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    await delay(0);
    expect(
      sidebarContainer.querySelectorAll(
        '.' + idMap('app_sidebar_content_panel')
      ).length
    ).toBe(3);
    expect(
      sidebarContainer.querySelectorAll('.' + idMap('sidebar_button_container'))
        .length
    ).toBe(2);
  });
});

describe('With old add-ons html', function() {
  it('construction works', () => {
    const sidebarContainer = makeAddonSidebarWithV1HTML();
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div'),
      sidebarContainer
    );
  });

  it('sidebar is added', async () => {
    const sidebarContainer = makeAddonSidebarWithV1HTML();
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div'),
      sidebarContainer
    );

    const panel = gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    await delay(0);
    expect(
      sidebarContainer.querySelectorAll(
        '.' + idMap('app_sidebar_content_panel')
      ).length
    ).toBe(1);
    expect(
      sidebarContainer.querySelectorAll('.' + idMap('sidebar_button_container'))
        .length
    ).toBe(1);

    panel.remove();
    expect(
      sidebarContainer.querySelectorAll(
        '.' + idMap('app_sidebar_content_panel')
      ).length
    ).toBe(0);
    expect(
      sidebarContainer.querySelectorAll('.' + idMap('sidebar_button_container'))
        .length
    ).toBe(0);
  });

  it('icons get grouped by appName', async () => {
    const sidebarContainer = makeAddonSidebarWithV1HTML();
    const gmailAppSidebarView = new GmailThreadSidebarView(
      makeDriver(),
      document.createElement('div'),
      sidebarContainer
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        appName: 'foo',
        title: 'foo 1',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        appName: 'foo',
        title: 'foo 2',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    gmailAppSidebarView.addSidebarContentPanel(
      Kefir.constant({
        appName: 'bar',
        title: 'bar 2',
        iconUrl: '/bar.png',
        el: document.createElement('div')
      })
    );

    await delay(0);
    expect(
      sidebarContainer.querySelectorAll(
        '.' + idMap('app_sidebar_content_panel')
      ).length
    ).toBe(3);
    expect(
      sidebarContainer.querySelectorAll('.' + idMap('sidebar_button_container'))
        .length
    ).toBe(2);
  });
});

function makeDriver(appId, opts): any {
  return {
    getAppId: () => appId || 'test',
    getOpts: () => opts || { appName: 'Test', appIconUrl: 'testImage.png' },
    getLogger() {
      return {
        eventSdkPassive() {},
        error(err, details) {
          console.error('logger.error called:', err, details); //eslint-disable-line no-console
          throw err;
        }
      };
    }
  };
}

function makeAddonSidebarWithV1HTML(): HTMLElement {
  const mainContainer = document.createElement('div');

  mainContainer.innerHTML = fs.readFileSync(
    __dirname +
      '/../../../../../../test/data/gmail-2017-06-22-gmail-addon-sidebar.html',
    'utf8'
  );

  (GmailElementGetter: any).getMainContentBodyContainerElement = () =>
    mainContainer.querySelector('.bkK');

  return (mainContainer.querySelector('.bnl'): any);
}

function makeAddonSidebarWithV2HTML(): HTMLElement {
  const mainContainer = document.createElement('div');

  mainContainer.innerHTML = fs.readFileSync(
    __dirname +
      '/../../../../../../test/data/gmail-2017-09-08-gmail-addon-sidebar.html',
    'utf8'
  );

  (GmailElementGetter: any).getMainContentBodyContainerElement = () =>
    mainContainer.querySelector('.bkK');

  return (mainContainer.querySelector('.bnl'): any);
}
