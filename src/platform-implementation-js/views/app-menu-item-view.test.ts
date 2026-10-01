import Kefir from 'kefir';
import delay from 'pdelay';
import { AppMenuItemView } from './app-menu-item-view';
import { GmailAppMenuItemView } from '../dom-driver/gmail/views/gmail-app-menu-item-view';
import { CollapsiblePanelView } from './collapsible-panel-view';
import type GmailDriver from '../dom-driver/gmail/gmail-driver';
import type { AppMenuItemDescriptor } from '../namespaces/app-menu';

function makeAppMenu() {
  document.body.innerHTML = `
    <div class="aqk aql bkL">
      <div class="Xa XJ apV"><div class="V6 CL"></div></div>
      <div class="aqn aIH apV"></div>
    </div>`;
  return {
    container: document.querySelector<HTMLElement>('.aqk')!,
    mailItem: document.querySelector<HTMLElement>('.Xa.XJ')!,
    mailPanel: document.querySelector<HTMLElement>('.aqn.aIH')!,
  };
}

test('the route that is current when the first item is added activates Mail', async () => {
  const { container, mailItem, mailPanel } = makeAppMenu();
  const inboxRoute = {
    getRouteID: () => 'inbox',
    getRouteType: () => 'LIST',
  };
  const descriptor = {
    name: 'Test',
    isRouteActive: () => false,
  } as unknown as AppMenuItemDescriptor;
  const driver = {
    addAppMenuItem: async () => ({
      menuItemDescriptor: descriptor,
      element: document.createElement('div'),
      on: jest.fn(),
    }),
    getRouteViewDriverStream: () => Kefir.constant(inboxRoute),
    elementGetter: {
      getAppMenuAsync: () => Promise.resolve(container),
      getAppMenuContainer: () => container,
      getAppMenu: () => container,
    },
  } as unknown as GmailDriver;

  new AppMenuItemView(driver, descriptor);
  await delay(0);

  expect(mailItem.classList).toContain(
    GmailAppMenuItemView.elementCss.SDK_ACTIVE,
  );
  expect(mailPanel.classList).toContain(
    CollapsiblePanelView.elementCss.SDK_ACTIVE,
  );
});
