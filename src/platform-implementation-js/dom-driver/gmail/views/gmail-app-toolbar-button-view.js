/* @flow */

import querySelector from '../../../lib/dom/querySelectorOrFail';
import censorHTMLtree from '../../../../common/censor-html-tree';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import type {Stopper} from 'kefir-stopper';
import updateIcon from '../lib/update-icon/update-icon';
import GmailElementGetter from '../gmail-element-getter';
import GmailTooltipView from '../widgets/gmail-tooltip-view';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import type Driver from '../gmail-driver';

export default class GmailAppToolbarButtonView {
  _stopper: Stopper;
  _iconSettings: Object;
  _element: ?HTMLElement = null;
  _activeDropdown: ?DropdownView;
  _buttonDescriptor: ?Object;
  _driver: Driver;

  constructor(driver: Driver, inButtonDescriptor: Kefir.Observable<Object>) {
    this._driver = driver;
    this._stopper = kefirStopper();
    this._iconSettings = {};
    inButtonDescriptor
      .takeUntilBy(this._stopper)
      .onValue((buttonDescriptor) => {
        try {
          this._handleButtonDescriptor(buttonDescriptor);
        } catch(err) {
          this._driver.getLogger().error(err);
        }
      });
  }

  destroy() {
    this._stopper.destroy();
    if (this._element) {
      this._element.remove();
    }
    if (this._activeDropdown) {
      this._activeDropdown.close();
    }
  }

  getStopper(): Kefir.Observable<null> {return this._stopper;}
  getElement(): ?HTMLElement {return this._element;}

  open() {
    try {
      if(!this._activeDropdown){
        this._handleClick();
      }
    } catch(err) {
      this._driver.getLogger().error(err);
    }
  }

  close() {
    try {
      if(this._activeDropdown){
        this._handleClick();
      }
    } catch(err) {
      this._driver.getLogger().error(err);
    }
  }

  _handleButtonDescriptor(buttonDescriptor: Object) {
    if(!buttonDescriptor){
      throw new Error('The application passed an invalid value for buttonDescriptor');
    }
    const element = this._element = this._element || _createAppButtonElement(this._driver, () => {this._handleClick();});
    this._buttonDescriptor = buttonDescriptor;
    updateIcon(this._iconSettings, querySelector(element, 'a'), false, buttonDescriptor.iconClass, buttonDescriptor.iconUrl);
    _updateTitle(querySelector(element, 'span'), buttonDescriptor);
  }

  _handleClick() {
    const element = this._element;
    if (!element) {
      // We must have failed to create the element. An error would have already
      // been logged.
      return;
    }
    const buttonDescriptor = this._buttonDescriptor;
    if (!buttonDescriptor) {
      throw new Error("app toolbar button clicked before receiving button descriptor");
    }

    if (this._activeDropdown) {
      this._activeDropdown.close();
    } else {
      var appEvent = {};
      var tooltipView = new GmailTooltipView();
      tooltipView.getContainerElement().classList.add('inboxsdk__appButton_tooltip');
      tooltipView.getContentElement().innerHTML = '';

      if(buttonDescriptor.arrowColor){
        querySelector(tooltipView.getContainerElement(), '.T-P-atC').style.borderTopColor = buttonDescriptor.arrowColor;
      }

      appEvent.dropdown = this._activeDropdown = new DropdownView(tooltipView, element, {manualPosition: true});
      appEvent.dropdown.on('destroy', () => {
        this._activeDropdown = null;
      });

      if(buttonDescriptor.onClick){
        buttonDescriptor.onClick.call(null, appEvent);
      }

      if(this._element){
        tooltipView.anchor(
          this._element,
          {position: 'bottom', offset: {top: 8}}
        );
      }
    }
  }
}

function _createAppButtonElement(driver: Driver, onclick: (event: Object) => void): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('class', 'inboxsdk__appButton');

  element.innerHTML = `<a href="#">
               <span class="inboxsdk__appButton_title"></span>
             </a>`;

  element.addEventListener('click', (event: MouseEvent) => {
    event.preventDefault();
    onclick(event);
  });

  const topAccountContainer = GmailElementGetter.getTopAccountContainer();
  if(!topAccountContainer){
    const err = new Error("Could not make button");
    const banner = document.querySelector('[role=banner]');
    driver.getLogger().error(err, {
      type: 'failed to make appToolbarButton',
      gbsfwPresent: !!document.getElementById('gbsfw'),
      bannerHtml: banner && censorHTMLtree(banner)
    });
    throw err;
  }

  const insertionElement: ?HTMLElement = (topAccountContainer.children[0]: any);
  if(!insertionElement){
    const err = new Error("Could not make button");
    driver.getLogger().error(err, {
      type: 'failed to make appToolbarButton',
      topAccountContainerHTML: censorHTMLtree(topAccountContainer)
    });
    throw err;
  }

  try {
    if(!GmailElementGetter.isGplusEnabled()){
      element.classList.add('inboxsdk__appButton_noGPlus');
    }

    insertionElement.insertBefore(element, insertionElement.firstElementChild);
    return element;
  } catch(err) {
    driver.getLogger().error(err, {
      type: 'failed to make appToolbarButton',
      insertionElementHTML: censorHTMLtree(insertionElement)
    });
    throw err;
  }
}

function _updateTitle(element: HTMLElement, descriptor: Object) {
  element.textContent = descriptor.title;
  element.className = `inboxsdk__appButton_title ${descriptor.titleClass||''}`;
}
