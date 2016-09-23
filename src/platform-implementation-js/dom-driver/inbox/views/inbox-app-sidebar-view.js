/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import fakeWindowResize from '../../../lib/fake-window-resize';
import findParent from '../../../lib/dom/find-parent';
import getChatSidebarClassname from '../getChatSidebarClassname';
import waitForAnimationClickBlockerGone from '../waitForAnimationClickBlockerGone';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import appSidebarIcon from '../../../lib/appSidebarIcon';

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

    // We need to be able to cooperate with other apps/extensions that are
    // sharing the app sidebar. We do this by using the shared DOM as the
    // source of truth about the state of the sidebar and as a signalling
    // mechanism. When InboxAppSidebarView is instantiated, we check to see if
    // the element already exists. If it doesn't, then we create the element,
    // and set up some mutation observers to watch for changes to the sidebar
    // and reposition it and modify the page as needed.
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
  }

  destroy() {
    this._stopper.destroy();
    this._el.remove();
  }

  // This value controls whether the app sidebar should automatically open
  // itself when available when the chat sidebar isn't present. It's only set
  // if the user interacts with the app sidebar button.
  _getShouldAppSidebarOpen(): boolean {
    return localStorage.getItem('inboxsdk__app_sidebar_should_open') === 'true';
  }

  _setShouldAppSidebarOpen(open: boolean) {
    try {
      localStorage.setItem('inboxsdk__app_sidebar_should_open', String(open));
    } catch(err) {
      console.error('error saving', err);
    }
  }

  _createElement() {
    const el = document.createElement('div');
    el.style.display = 'none';
    el.className = 'inboxsdk__app_sidebar';
    el.innerHTML = `
      <div class="inboxsdk__sidebar_panel_buttons"></div>
      <div class="inboxsdk__sidebar_panel_content_area"></div>
    `;
    el.setAttribute('data-open', 'false');
    document.body.appendChild(el);

    const contentArea = el.querySelector('.inboxsdk__sidebar_panel_content_area');

    {
      // When the sidebar switches between having no contents and having at
      // least one item, we toggle whether the app sidebar button is visible,
      // and we close the sidebar if it's empty now.
      let appToolbarButtonPromise = null;
      makeMutationObserverChunkedStream(contentArea, {childList: true})
        .map(() => contentArea.childElementCount > 0)
        .skipDuplicates()
        .onValue(hasChildren => {
          if (hasChildren) {
            if (!appToolbarButtonPromise) {
              appToolbarButtonPromise = this._driver.addToolbarButtonForApp(Kefir.constant({
                title: 'Extension Sidebar',
                iconUrl: appSidebarIcon,
                hasDropdown: false,
                onClick: () => {
                  const newState = el.getAttribute('data-open') !== 'true';
                  this._setShouldAppSidebarOpen(newState);
                  this._setOpenedNow(newState);
                }
              }));
            }
          } else {
            if (appToolbarButtonPromise) {
              appToolbarButtonPromise.then(x => { x.destroy(); });
              appToolbarButtonPromise = null;
            }
            this._setOpenedNow(false);
          }
        });
    }

    // If the user clicks the chat button while the chat sidebar and app
    // sidebar are both open, then we want the chat sidebar to become visible.
    // We block Inbox from closing the chat sidebar, and we close the app sidebar.
    fromEventTargetCapture(this._driver.getChatSidebarButton(), 'click')
      .filter(() =>
        el.getAttribute('data-open') === 'true' &&
        this._driver.getCurrentChatSidebarView().getMode() === 'SIDEBAR'
      )
      .takeUntilBy(this._stopper)
      .onValue(event => {
        event.stopImmediatePropagation();
        this._setShouldAppSidebarOpen(false);
        this._setOpenedNow(false);
      });

    this._driver.getCurrentChatSidebarView().getModeStream()
      .changes()
      .takeUntilBy(this._stopper)
      .onValue(mode => {
        if (mode === 'SIDEBAR') {
          // If the user clicks the chat button while the chat sidebar is
          // closed and the app sidebar is open, and Inbox opens the chat
          // sidebar, then we want the chat sidebar to become visible. We just
          // hide the app sidebar after Inbox brings up the chat sidebar.
          this._setShouldAppSidebarOpen(false);
          this._setOpenedNow(false);
        } else {
          // If the chat sidebar changes in any other way
          // (ie. HIDDEN<->DROPDOWN) while the app sidebar is open, then we
          // might need to fix up some class changes that Inbox might have
          // made.
          if (el.getAttribute('data-open') === 'true') {
            this._setOpenedNow(true);
          }
        }
      });

    return el;
  }

  _setOpenedNow(open: boolean) {
    this._el.setAttribute('data-open', String(open));
    if (!open) {
      this._el.style.display = 'none';

      if (
        this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR' &&
        this._mainParent.classList.contains(getChatSidebarClassname())
      ) {
        this._mainParent.classList.remove(getChatSidebarClassname());
        this._driver.getPageCommunicator().fakeWindowResize();
      }
    } else {
      this._el.style.display = '';

      if (
        this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR' &&
        !this._mainParent.classList.contains(getChatSidebarClassname())
      ) {
        this._mainParent.classList.add(getChatSidebarClassname());
        this._driver.getPageCommunicator().fakeWindowResize();
      }
    }
  }

  _setOpenedAfterAnimation(open: boolean) {
    waitForAnimationClickBlockerGone()
      .takeUntilBy(this._stopper)
      .takeUntilBy(makeMutationObserverChunkedStream(this._el, {attributes: true, attributeFilter: ['data-open']}))
      .onValue(() => this._setOpenedNow(open));
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

    if (
      this._driver.getCurrentChatSidebarView().getMode() === 'SIDEBAR' ||
      this._getShouldAppSidebarOpen()
    ) {
      this._setOpenedAfterAnimation(true);
    }

    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
        // _createElement sets up a MutationObserver which will close the
        // sidebar at this point if it should be closed.
      });

    view.getStopper()
      .onValue(() => {
        button.remove();
      });
    return view;
  }
}

export default defn(module, InboxAppSidebarView);
