/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import fakeWindowResize from '../../../lib/fake-window-resize';
import findParent from '../../../lib/dom/find-parent';
import getChatSidebarClassname from '../getChatSidebarClassname';
import waitForAnimationClickBlockerGone from '../waitForAnimationClickBlockerGone';

import type InboxDriver from '../inbox-driver';
import InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';

class InboxAppSidebarView {
  _stopper = kefirStopper();
  _driver: InboxDriver;
  _el: HTMLElement;
  _buttonContainer: HTMLElement;
  _contentArea: HTMLElement;
  _mainParent: HTMLElement;

  constructor(driver: InboxDriver) {
    this._driver = driver;
    this._el = document.querySelector('.inboxsdk__app_sidebar') || this._createElement();
    this._buttonContainer = this._el.querySelector('.inboxsdk__sidebar_panel_buttons');
    this._contentArea = this._el.querySelector('.inboxsdk__sidebar_panel_content_area');

    const mainParent = findParent(document.querySelector('[role=application]'), el => el.parentElement === document.body);
    if (!mainParent) {
      const err = new Error('Failed to find main parent');
      this._driver.getLogger().errorSite(err);
      throw err;
    }
    this._mainParent = mainParent;

    this._positionSidebar();
  }

  destroy() {
    this._stopper.destroy();
    this._el.remove();
  }

  _createElement() {
    const el = document.createElement('div');
    el.className = 'inboxsdk__app_sidebar';
    el.innerHTML = `
      <div class="inboxsdk__sidebar_panel_buttons"></div>
      <div class="inboxsdk__sidebar_panel_content_area"></div>
    `;
    document.body.appendChild(el);
    return el;
  }

  _positionSidebar() {
    Kefir.later(0)
      .flatMap(waitForAnimationClickBlockerGone)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        if (this._buttonContainer.childElementCount === 0) {
          this._el.style.display = 'none';

          if (this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR') {
            this._mainParent.classList.remove(getChatSidebarClassname());
            this._driver.getPageCommunicator().fakeWindowResize();
          }
        } else {
          this._el.style.display = '';
          this._el.style.position = 'fixed';
          this._el.style.right = '0';
          this._el.style.top = '60px';

          if (this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR') {
            this._mainParent.classList.add(getChatSidebarClassname());
            this._driver.getPageCommunicator().fakeWindowResize();
          }
        }
      });
  }

  _hideAllPanels() {
    _.forEach(this._contentArea.children, el => {
      el.style.display = 'none';
    });
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const view = new InboxSidebarContentPanelView(descriptor);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(this._buttonContainer.childElementCount);
    this._buttonContainer.appendChild(button);

    button.addEventListener('click', () => {
      this._hideAllPanels();
      view.getElement().style.display = '';
    });

    this._hideAllPanels();
    this._contentArea.appendChild(view.getElement());
    this._positionSidebar();

    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
      });

    view.getStopper()
      .onValue(() => {
        button.remove();
        this._hideAllPanels();
        this._positionSidebar();
      });
    return view;
  }
}

export default defn(module, InboxAppSidebarView);
