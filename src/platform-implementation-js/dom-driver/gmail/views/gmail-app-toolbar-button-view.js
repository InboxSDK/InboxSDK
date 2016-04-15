/* @flow */
//jshint ignore:start

import Logger from '../../../lib/logger';
import censorHTMLtree from '../../../../common/censor-html-tree';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import kefirStopper from 'kefir-stopper';
import updateIcon from '../lib/update-icon/update-icon';
import GmailElementGetter from '../gmail-element-getter';
import GmailTooltipView from '../widgets/gmail-tooltip-view';
import DropdownView from '../../../widgets/buttons/dropdown-view';

export default class GmailAppToolbarButtonView {
  _stopper: Kefir.Stream&{destroy:()=>void};
  _iconSettings: Object;
  _element: ?HTMLElement = null;
  _activeDropdown: ?DropdownView;
  _buttonDescriptor: ?Object;

  constructor(inButtonDescriptor: Object) {
    this._stopper = kefirStopper();
    this._iconSettings = {};
    var buttonDescriptorProperty = kefirCast(Kefir, inButtonDescriptor);
    buttonDescriptorProperty.onValue((buttonDescriptor) => {
      try {
        this._handleButtonDescriptor(buttonDescriptor);
      } catch(err) {
        Logger.error(err);
      }
    });
  }

/*
  __memberVariables: [
    {name: '_stopper', destroy: true},
    {name: '_buttonDescriptor', destroy: false},
    {name: '_element', destroy: true, get: true},
    {name: '_activeDropdown', destroy: true, destroyFunction: 'close'},
    {name: '_iconSettings', destroy: false, defaultValue: {}}
  ],
*/
  destroy() {
    this._stopper.destroy();
    if (this._element) {
      (this._element:any).remove();
    }
    if (this._activeDropdown) {
      this._activeDropdown.close();
    }
  }

  getStopper(): Kefir.Stream {return this._stopper;}
  getElement(): ?HTMLElement {return this._element;}

  open() {
    if(!this._activeDropdown){
      this._handleClick();
    }
  }

  close() {
    if(this._activeDropdown){
      this._handleClick();
    }
  }

  _handleButtonDescriptor(buttonDescriptor: Object) {
    if(!buttonDescriptor){
      return;
    }

    var element = this._element = this._element || _createAppButtonElement(() => {this._handleClick();});
    this._buttonDescriptor = buttonDescriptor;
    var currentTitle = null;
    updateIcon(this._iconSettings, element.querySelector('a'), false, buttonDescriptor.iconClass, buttonDescriptor.iconUrl);
    _updateTitle(element.querySelector('span'), currentTitle, buttonDescriptor.title);
    currentTitle = buttonDescriptor.title;
  }

  _handleClick() {
    if (!this._buttonDescriptor) throw new Error("Should not happen");
    var buttonDescriptor = this._buttonDescriptor;

    if (this._activeDropdown) {
      this._activeDropdown.close();
    } else {
      var appEvent = {};
      var tooltipView = new GmailTooltipView();
      tooltipView.getContainerElement().classList.add('inboxsdk__appButton_tooltip');
      tooltipView.getContentElement().innerHTML = '';

      if(buttonDescriptor.arrowColor){
        tooltipView.getContainerElement().querySelector('.T-P-atC').style.borderTopColor = buttonDescriptor.arrowColor;
      }

      appEvent.dropdown = this._activeDropdown = new DropdownView(tooltipView, this._element, {manualPosition: true});
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

function _createAppButtonElement(onclick: (event: Object) => void): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('class', 'inboxsdk__appButton');

  element.innerHTML = `<a href="#">
               <span class="inboxsdk__appButton_title"></span>
             </a>`;

  element.addEventListener('click', (event) => {
    event.preventDefault();
    onclick(event);
  });

  const topAccountContainer = GmailElementGetter.getTopAccountContainer();
  if(!topAccountContainer){
    throw new Error("Could not make button");
  }

  const insertionElement: ?HTMLElement = (topAccountContainer.children[0]: any);
  if(!insertionElement){
    try {
      throw new Error("Could not make button");
    } catch(err) {
      Logger.error(err, {
        topAccountContainerHTML: censorHTMLtree(topAccountContainer)
      });
      throw err;
    }
  }

  try {
    if(!GmailElementGetter.isGplusEnabled()){
      element.classList.add('inboxsdk__appButton_noGPlus');
    }

    insertionElement.insertBefore(element, insertionElement.firstElementChild);
    return element;
  } catch(err) {
    Logger.error(err, {
      insertionElementHTML: censorHTMLtree(insertionElement)
    });
    throw err;
  }
}

function _updateTitle(element: HTMLElement, currentTitle: ?string, newTitle: string) {
  if(currentTitle === newTitle){
    return;
  }
  element.textContent = newTitle;
}
