/* @flow */

import {defn} from 'ud';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import querySelector from '../../../lib/dom/querySelectorOrFail';

class InboxModalView {
  _eventStream: Bus<Object> = kefirBus();
  _modalContainerElement: HTMLElement;

  constructor(options: Object) {
    this._setupModalContainerElement(options);

    this._processOptions(options);

    const closeElement = querySelector(this._modalContainerElement, '.inboxsdk__close_button');

    closeElement.addEventListener('click', (event: MouseEvent) => {
      this._eventStream.emit({
        eventName: 'closeClick',
        domEvent: event
      });
    });
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
    this.setChromeClasses(options.chrome, options.showCloseButton);
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
    const buttonContainer = querySelector(this._modalContainerElement, '.inboxsdk__modal_buttons');

    if (buttons.length > 0) {
      this._modalContainerElement.classList.add('inboxsdk__modal_hasButtons');
    } else {
      this._modalContainerElement.classList.remove('inboxsdk__modal_hasButtons');
    }

    buttonContainer.innerHTML = '';
    _.sortBy(buttons, [
      button => button.type === 'PRIMARY_ACTION' ? 0 : 1,
      button => button.orderHint || 0
    ])
      .forEach(buttonDescriptor => {
        var buttonEl = document.createElement('input');
        buttonEl.className = buttonDescriptor.type === 'PRIMARY_ACTION' ? 'inboxsdk__primary' : '';
        buttonEl.type = 'button';
        buttonEl.value = buttonDescriptor.text;
        buttonEl.addEventListener('click', (event: MouseEvent) => {
          event.preventDefault();
          buttonDescriptor.onClick.call(null);
        });
        buttonContainer.appendChild(buttonEl);
      });
  }

  setChromeClasses(chrome: boolean, showCloseButton: boolean) {
    if (chrome === false) {
      this._modalContainerElement.classList.add('inboxsdk__modal_chromeless');
    } else {
      this._modalContainerElement.classList.remove('inboxsdk__modal_chromeless');
    }
    if (showCloseButton) {
      this._modalContainerElement.classList.add('inboxsdk__modal_showCloseButton');
    } else {
      this._modalContainerElement.classList.remove('inboxsdk__modal_showCloseButton');
    }
  }

  _setupModalContainerElement() {
    this._modalContainerElement = document.createElement('div');
    this._modalContainerElement.className = 'inboxsdk__modal_fullscreen';

    var htmlString = `
    <div class="inboxsdk__modal_container" tabindex="0" role="alertdialog">
      <div class="inboxsdk__modal_toprow">
        <span role="heading"></span>
        <button title="Close" class="inboxsdk__close_button"></button>
      </div>
      <div class="inboxsdk__modal_content">
      </div>
      <div class="inboxsdk__modal_buttons"></div>
    </div>
    `;

    this._modalContainerElement.innerHTML = htmlString;
  }
}

export default defn(module, InboxModalView);
