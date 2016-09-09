/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import fakeWindowResize from '../../../lib/fake-window-resize';
import findParent from '../../../lib/dom/find-parent';
import getChatSidebarClassname from '../getChatSidebarClassname';
import waitForAnimationClickBlockerGone from '../waitForAnimationClickBlockerGone';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';

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

    this._positionSidebarAfterAnimation();
  }

  destroy() {
    this._stopper.destroy();
    this._el.remove();
  }

  _hasAppToolbarButton(): boolean {
    return this._el.getAttribute('data-sdk-has-app-toolbar-button') === 'true';
  }

  _setHasAppToolbarButton(x: boolean) {
    this._el.setAttribute('data-sdk-has-app-toolbar-button', String(x));
  }

  _createElement() {
    const el = document.createElement('div');
    el.style.display = 'none';
    el.className = 'inboxsdk__app_sidebar';
    el.innerHTML = `
      <div class="inboxsdk__sidebar_panel_buttons"></div>
      <div class="inboxsdk__sidebar_panel_content_area"></div>
    `;
    document.body.appendChild(el);

    this._driver.getCurrentChatSidebarView().getModeStream()
      .changes()
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._positionSidebarNow();
      });

    {
      let appToolbarButtonPromise = null;
      el.addEventListener('inboxSDKremoveAppToolbar', () => {
        if (appToolbarButtonPromise) {
          appToolbarButtonPromise.then(x => { x.destroy(); });
          appToolbarButtonPromise = null;
          this._setHasAppToolbarButton(false);
        }
      });
      el.addEventListener('inboxSDKaddAppToolbar', () => {
        if (!appToolbarButtonPromise) {
          appToolbarButtonPromise = this._driver.addToolbarButtonForApp(Kefir.constant({
            title: 'Extension Sidebar',
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AkJAQ4EMqQfeQAAA91JREFUSMetlU1PI0cQhqu6enrGHjPYSGDI7lgYcATJKXwcsiKn/IAIxJGfxpV/sKfkkgOwQkpQIvmwQhgbw4KTGWYZjGfGpqc7F3tjvhaibEkjtTTqerreqn4bt7a2MuVy+XvbtqcAAOHLhO50Ohf1ev0dn5mZeTM3N/cjAKQv2fgfDvEtIiLPZrNTAJBqrZ8EMMY0YwwAAJRSoJR6FoKIkM1mp/izR9YaGo1G3vO81wAAIyMjf83Ozl4SkX5JGZ8FMMb0yclJ1rbt1dXV1WUAgIODg99OTk5+LZfLESI+C2GPlUZEmjGmiUiHYWgUi8WpwX/btgtRFBmMMSAi/VwlDyrwPM8MgmCMiDTnXCKi2Nvbe7++vv4qiqLe27dv3y8sLIzUajVTKcWklKpcLvumaabPArTW4Pt+YWlp6SdEpF6vJ5VS2rbtHACAEIKvra0tc85TIQQJIYxms/khCIJfJicnbx6T7A5AKYWIaOVyubxhGCYigtb/7iEiNj09XRw+kNb6UkpJSil8TK47PUjTFIkoO5j14eSDdT8pKKUGe1iSJBRFEUkp8bMARASllEZE1l/DY6BhGOecfN93kyT54fj4+Ot2u208KRER6TiOg/Pz84v9/f1Wr9eDjY2N74QQ/H4Vg6hUKq9mZ2enhBDC87y/q9VqND8//2EgF7s/967rXu/u7v5s2/afAFBttVr+cC+GkwMAcM65EEIwxnB0dHTs+vq6IKVkA5kf9CAIgvGVlZU3pmm+5pxn8vl8Vil1R5rhODo68nd3d4+vrq6iw8PDc8uy2sNWwu8DDMNwpqenK6VSaS5NUyWEMPtaAyKClPJTbxAROp1OdHp6etBqtYRlWW3XdS+JSPWN8S4AEaHb7UoppRJCCCICAICbm5tke3v7906nk2xubi4Xi8XRAcSyLDY+Pt52XTcgotQwDMk5TwGAHgAYYzqO40gppQZyMMbg7OwsME2z7jiOPDs7K01OTo4O+mFZltBaYyaT6RqGkd6/bA+mqNvttrXWn+xZaw0zMzPjtVptjHNOi4uLFaUUICIwxsC2bUtKaQCAfvYmAwBMTEzc7uzs7OTz+a845xnOOYVheHV7e/sxjmPebDabYRim7Xa76/t+OwzDj6VS6RoRX2Z2rutGnuf94fv+YZIkIk1TzOVyvUqlEimloFqtemmaCiICx3Gk67pdx3GSp1yVP/IGqImJibhQKHS11kxrDX3rVoioHcdJ0jRlA0kZY6r/vawCRARE1H37fWDBRJS+8P0GANA8juMLAPjmKQ3/R1AURRe8Xq/vaa2h//h/sYii6KLRaLz7B1rlCIv4H+ixAAAAAElFTkSuQmCC',
            hasDropdown: false,
            onClick: () => alert('foo')
          }));
          this._setHasAppToolbarButton(true);
        }
      });
    }

    fromEventTargetCapture(this._driver.getChatSidebarButton(), 'click')
      .filter(() =>
        this._el.style.display !== 'none' &&
        this._driver.getCurrentChatSidebarView().getMode() === 'SIDEBAR'
      )
      .takeUntilBy(this._stopper)
      .onValue(event => {
        event.stopImmediatePropagation();
        this._el.style.display = 'none';
      });
    Kefir.fromEvents(this._driver.getChatSidebarButton(), 'click')
      .delay(0)
      .filter(() =>
        console.log('display', this._el.style.display, 'mode', this._driver.getCurrentChatSidebarView().getMode())||true
      )
      .filter(() =>
        this._el.style.display !== 'none' &&
        this._driver.getCurrentChatSidebarView().getMode() === 'SIDEBAR'
      )
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._el.style.display = 'none';
      });

    return el;
  }

  _positionSidebarNow() {
    if (this._buttonContainer.childElementCount === 0) {
      this._el.style.display = 'none';

      if (this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR') {
        this._mainParent.classList.remove(getChatSidebarClassname());
        this._driver.getPageCommunicator().fakeWindowResize();
      }
      if (this._hasAppToolbarButton()) {
        this._el.dispatchEvent(new CustomEvent('inboxSDKremoveAppToolbar', {
          bubbles: false, cancelable: false
        }));
      }
    } else {
      this._el.style.display = '';

      if (this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR') {
        this._mainParent.classList.add(getChatSidebarClassname());
        this._driver.getPageCommunicator().fakeWindowResize();
      }
      if (!this._hasAppToolbarButton()) {
        this._el.dispatchEvent(new CustomEvent('inboxSDKaddAppToolbar', {
          bubbles: false, cancelable: false
        }));
      }
    }
  }

  _positionSidebarAfterAnimation() {
    Kefir.later(0)
      .flatMap(waitForAnimationClickBlockerGone)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._positionSidebarNow();
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
    this._positionSidebarAfterAnimation();

    this._stopper
      .takeUntilBy(view.getStopper())
      .onValue(() => {
        view.remove();
      });

    view.getStopper()
      .onValue(() => {
        button.remove();
        this._hideAllPanels();
        this._positionSidebarAfterAnimation();
      });
    return view;
  }
}

export default defn(module, InboxAppSidebarView);
