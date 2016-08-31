/* @flow */

import {defn} from 'ud';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {Parsed} from '../detection/chatSidebar/parser';

import InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';

class InboxChatSidebarView {
  _el: HTMLElement;
  _p: Parsed;
  _stopper = kefirStopper();
  _appSidebar: ?{
    container: HTMLElement;
    buttonContainer: HTMLElement;
    contentArea: HTMLElement;
  } = null;

  constructor(el: HTMLElement, p: Parsed) {
    this._el = el;
    this._p = p;
  }

  _setupAppSidebar() {
    if (!this._appSidebar) {
      const container = document.createElement('div');
      container.className = 'inboxsdk__sidebar_panel_container';
      container.innerHTML = `
        <div class="inboxsdk__sidebar_panel_buttons"></div>
        <div class="inboxsdk__sidebar_panel_content_area"></div>
      `;

      const buttonContainer = container.querySelector('.inboxsdk__sidebar_panel_buttons');
      const contentArea = container.querySelector('.inboxsdk__sidebar_panel_content_area');

      const chatButton = document.createElement('button');
      chatButton.type = 'button';
      chatButton.textContent = 'Chat';
      chatButton.addEventListener('click', () => {
        this._hideAllPanels();
        container.classList.remove('inboxsdk__hide_everything_after');
      });
      buttonContainer.appendChild(chatButton);

      this._el.insertBefore(container, this._el.firstChild);
      this._appSidebar = {container, buttonContainer, contentArea};
    }
    return this._appSidebar;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  destroy() {
    this._stopper.destroy();
  }

  _hideAllPanels() {
    if (!this._appSidebar) return;
    const {contentArea} = this._appSidebar;
    _.forEach(contentArea.children, el => {
      el.style.display = 'none';
    });
  }

  addSidebarContentPanel(descriptor: Kefir.Observable<Object>) {
    const {container, buttonContainer, contentArea} = this._setupAppSidebar();

    const view = new InboxSidebarContentPanelView(descriptor);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(buttonContainer.childElementCount);
    buttonContainer.appendChild(button);

    button.addEventListener('click', () => {
      container.classList.add('inboxsdk__hide_everything_after');
      this._hideAllPanels();
      view.getElement().style.display = '';
    });

    container.classList.add('inboxsdk__hide_everything_after');
    this._hideAllPanels();
    contentArea.appendChild(view.getElement());

    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
      });

    view.getStopper()
      .onValue(() => {
        button.remove();
        this._hideAllPanels();
        container.classList.remove('inboxsdk__hide_everything_after');
      });
    return view;
  }
}

export default defn(module, InboxChatSidebarView);
