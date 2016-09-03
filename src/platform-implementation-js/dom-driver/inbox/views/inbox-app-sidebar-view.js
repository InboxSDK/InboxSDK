/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import fakeWindowResize from '../../../lib/fake-window-resize';
import findParent from '../../../lib/dom/find-parent';

import type InboxDriver from '../inbox-driver';
import InboxSidebarContentPanelView from './inbox-sidebar-content-panel-view';

const getChatSidebarClassname: () => string = _.once(() => {
  const classRegexes: RegExp[] = Array.from((document.querySelector('[role=application]').classList: any))
    .map(x => new RegExp('\\.'+x+'\\b'));
  if (classRegexes.length === 0) throw new Error('no class names on element');

  function rulesToStyleRules(rule: CSSRule): Object[] {
    if (rule instanceof window.CSSMediaRule) {
      if (_.some(rule.media, m => window.matchMedia(m).matches)) {
        return _.flatMap(rule.cssRules, rulesToStyleRules);
      }
    } else if (rule instanceof window.CSSStyleRule) {
      return [rule];
    }
    return [];
  }

  const rules = _.chain(document.styleSheets)
    .map(sheet => sheet.cssRules)
    .flatMap(rulesToStyleRules)
    .filter(rule => classRegexes.some(r => r.test(rule.selectorText)))
    .value();
  console.log('rules', rules);

  //TODO
  return 'm';
});

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
    if (this._buttonContainer.childElementCount === 0) {
      this._el.style.display = 'none';

      if (this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR') {
        this._mainParent.classList.remove(getChatSidebarClassname());
        fakeWindowResize();
      }
    } else {
      this._el.style.display = '';
      this._el.style.position = 'fixed';
      this._el.style.right = '0';
      this._el.style.top = '60px';

      if (this._driver.getCurrentChatSidebarView().getMode() !== 'SIDEBAR') {
        this._mainParent.classList.add(getChatSidebarClassname());
        fakeWindowResize();
      }
    }
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
