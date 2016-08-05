/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import {defn} from 'ud';
import ButtonView from './buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

class GmailModalViewDriver {
  _eventStream: Kefir.Bus<any>;
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
  getEventStream(): Kefir.Stream<Object> { return this._eventStream; }

  _processOptions(options: Object) {
    this.setTitle(options.title);
    this.setContentElement(options.el);
    this.setButtons(options.buttons || []);
    this.setChromeClass(options.chrome, options.showCloseButton, (options.buttons || []).length > 0);
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
    this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').innerHTML = '';

    if (buttons.length === 0) {
      this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = 'none';
      this._modalContainerElement.classList.add('inboxsdk__modal_content_no_buttons');
    } else {
      this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = '';
      this._modalContainerElement.classList.remove('inboxsdk__modal_content_no_buttons');
    }

    _.sortBy(buttons, button => button.orderHint || 0)
      .forEach(this._addButton.bind(this, this._modalContainerElement.querySelector('.inboxsdk__modal_buttons')));
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

  _setupModalContainerElement() {
    this._modalContainerElement = document.createElement('div');
    this._modalContainerElement.className = 'inboxsdk__modal_fullscreen';

    var htmlString = `
    <div class="Kj-JD inboxsdk__modal_container" tabindex="0" role="alertdialog">
      <div class="Kj-JD-K7 Kj-JD-K7-GIHV4 inboxsdk__modal_toprow">
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
    var buttonOptions = _.clone(buttonDescriptor);
    buttonOptions.buttonColor = (buttonDescriptor.type === 'PRIMARY_ACTION' ? 'blue' : 'default');

    var buttonView = new ButtonView(buttonOptions);

    buttonOptions.buttonView = buttonView;
    var buttonViewController = new BasicButtonViewController(buttonOptions);

    if (buttonDescriptor.type === 'PRIMARY_ACTION') {
      buttonContainer.insertBefore(buttonView.getElement(), (buttonContainer.firstElementChild:any));
    } else {
      buttonContainer.appendChild(buttonView.getElement());
    }
  }

  _setupEventStream() {
    var closeElement = this._modalContainerElement.querySelector('.inboxsdk__modal_close');

    closeElement.addEventListener('click', event => {
      this._eventStream.emit({
        eventName: 'closeClick',
        domEvent: event
      });
    });
  }
}

export default defn(module, GmailModalViewDriver);
