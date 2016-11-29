/* @flow */

import {defn} from 'ud';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';

class InboxModalView {
  _eventStream: Bus<Object> = kefirBus();
  _modalContainerElement: HTMLElement;

  constructor(options: Object) {
    this._setupModalContainerElement(options);

    this._processOptions(options);

    const closeElement = this._modalContainerElement.querySelector('.inboxsdk__close_button');

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
    this.setChrome(options.chrome);
  }

  setTitle(title: string) {
    if (!title) {
      this._modalContainerElement.querySelector('[role=heading]').style.display = 'none';
    } else {
      this._modalContainerElement.querySelector('[role=heading]').style.display = '';
      this._modalContainerElement.querySelector('[role=heading]').textContent = title;
    }
  }

  setContentElement(element: HTMLElement) {
    this._modalContainerElement.querySelector('.inboxsdk__modal_content').innerHTML = '';
    if (typeof element === 'string') {
      this._modalContainerElement.querySelector('.inboxsdk__modal_content').innerHTML = element;
    } else if(element instanceof Element) {
      this._modalContainerElement.querySelector('.inboxsdk__modal_content').appendChild(element);
    }
  }

  setButtons(buttons: Object[]) {
    var buttonContainer = this._modalContainerElement.querySelector('.inboxsdk__modal_buttons');

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

  setChrome(chrome: boolean) {
    if (chrome === false) {
      this._modalContainerElement.classList.add('inboxsdk__modal_chromeless');
    } else {
      this._modalContainerElement.classList.remove('inboxsdk__modal_chromeless');
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
