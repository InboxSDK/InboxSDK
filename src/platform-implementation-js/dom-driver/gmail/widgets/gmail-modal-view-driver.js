/* @flow */

import sortBy from 'lodash/sortBy';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import {defn} from 'ud';
import ModalButtonView from './buttons/modal-button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';
import querySelector from '../../../lib/dom/querySelectorOrFail';

class GmailModalViewDriver {
  _eventStream: Bus<any>;
  _modalContainerElement: HTMLElement;

  constructor(options: Object) {
    this._setupModalContainerElement(options);

    this._processOptions(options);
    this._eventStream = kefirBus();
    this._setupEventStream();
  }

  destroy() {
    this._modalContainerElement.remove();
    this._eventStream.end();
  }

  getModalContainerElement(): HTMLElement { return this._modalContainerElement; }
  getEventStream(): Kefir.Observable<Object> { return this._eventStream; }

  _processOptions(options: Object) {
    this.setTitle(options.title);
    this.setContentElement(options.el);
    this.setButtons(options.buttons || []);
    this.setChromeClass(options.chrome, options.showCloseButton, (options.buttons || []).length > 0);
  }

  setTitle(title: string) {
    const heading = querySelector(this._modalContainerElement, '[role=heading]');
    if (!title) {
      heading.style.display = 'none';
    } else {
      heading.style.display = '';
      heading.textContent = title;
    }
  }

  setContentElement(element: HTMLElement) {
    const content = querySelector(this._modalContainerElement, '.inboxsdk__modal_content');
    content.innerHTML = '';
    if (typeof element === 'string') {
      content.innerHTML = element;
    } else if(element instanceof Element) {
      content.appendChild(element);
    }
  }

  setButtons(buttons: Object[]) {
    const buttonsEl = querySelector(this._modalContainerElement, '.inboxsdk__modal_buttons');
    buttonsEl.innerHTML = '';

    if (buttons.length === 0) {
      buttonsEl.style.display = 'none';
      this._modalContainerElement.classList.add('inboxsdk__modal_content_no_buttons');
    } else {
      buttonsEl.style.display = '';
      this._modalContainerElement.classList.remove('inboxsdk__modal_content_no_buttons');
    }

    sortBy(buttons, button => button.orderHint || 0)
      .forEach(this._addButton.bind(this, buttonsEl));
  }

  setChromeClass(chrome: boolean, showCloseButton: boolean, hasButtons: boolean) {
    this._modalContainerElement.classList.remove('inboxsdk__modal_hideSides');
    this._modalContainerElement.classList.remove('inboxsdk__modal_hideTop');
    this._modalContainerElement.classList.remove('inboxsdk__modal_hideBottom');

    if(chrome === false){
      this._modalContainerElement.classList.add('inboxsdk__modal_hideSides');

      if(!showCloseButton){
        this._modalContainerElement.classList.add('inboxsdk__modal_hideTop');
      }

      if(!hasButtons){
        this._modalContainerElement.classList.add('inboxsdk__modal_hideBottom');
      }
    }
  }

  _setupModalContainerElement(options: Object) {
    const constrainTitleWidthTopRowClass = options.constrainTitleWidth ? 'inboxsdk__modal_toprow--constrain-title-width' : '';

    this._modalContainerElement = document.createElement('div');
    this._modalContainerElement.className = 'inboxsdk__modal_fullscreen';

    var htmlString = `
    <div class="Kj-JD inboxsdk__modal_container" tabindex="0" role="alertdialog">
      <div class="Kj-JD-K7 Kj-JD-K7-GIHV4 inboxsdk__modal_toprow ${constrainTitleWidthTopRowClass}">
        <span class="Kj-JD-K7-K0" role="heading"></span>
        <span class="Kj-JD-K7-Jq inboxsdk__modal_close" tabindex="0" role="button"></span>
      </div>
      <div class="Kj-JD-Jz inboxsdk__modal_content">
      </div>
      <div class="Kj-JD-Jl inboxsdk__modal_buttons"></div>
    </div>
    `;

    this._modalContainerElement.innerHTML = htmlString;
  }

  _addButton(buttonContainer: HTMLElement, buttonDescriptor: Object) {
    const buttonOptions = {...buttonDescriptor};
    const buttonColor = ['blue', 'red', 'green'].includes(buttonDescriptor.color) && buttonDescriptor.color;
    buttonOptions.isPrimary = buttonDescriptor.type === 'PRIMARY_ACTION';

    const buttonView = new ModalButtonView(buttonOptions);

    buttonOptions.buttonView = buttonView;
    const buttonViewController = new BasicButtonViewController(buttonOptions);

    if (buttonDescriptor.type === 'PRIMARY_ACTION') {
      buttonContainer.insertBefore(buttonView.getElement(), (buttonContainer.firstElementChild:any));
    } else {
      buttonContainer.appendChild(buttonView.getElement());
    }
  }

  _setupEventStream() {
    const closeElement = querySelector(this._modalContainerElement, '.inboxsdk__modal_close');

    closeElement.addEventListener('click', (event: MouseEvent) => {
      this._eventStream.emit({
        eventName: 'closeClick',
        domEvent: event
      });
    });
  }
}

export default defn(module, GmailModalViewDriver);
