/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Kefir = require('kefir');
var kefirBus = require('kefir-bus');
import * as HMR from '../../../../common/hmr-util';
import ButtonView from './buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

var GmailModalViewDriver = HMR.makeUpdatableFn(module, class GmailModalViewDriver {
  _eventStream: Kefir.Bus;
  _modalContainerElement: HTMLElement;
  _overlayElement: HTMLElement;

  constructor(options: Object) {
    this._setupOverlayElement();
    this._setupModalContainerElement(options);

    this._processOptions(options);
    this._eventStream = kefirBus();
    this._setupEventStream();
  }

  destroy() {
    (this._overlayElement:any).remove();
    (this._modalContainerElement:any).remove();
    this._eventStream.end();
  }

  getOverlayElement(): HTMLElement { return this._overlayElement; }
  getModalContainerElement(): HTMLElement { return this._modalContainerElement; }
  getEventStream(): Kefir.Stream { return this._eventStream; }

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
    this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').innerHTML = '';

    if (buttons.length === 0) {
      this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = 'none';
    } else {
      this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = '';
    }

    this._checkForMoreThanOnePrimaryButton(buttons);
    _.sortBy(buttons, button => button.orderHint || 0)
      .forEach(this._addButton.bind(this, this._modalContainerElement.querySelector('.inboxsdk__modal_buttons')));
  }

  setChrome(chrome: boolean) {
    if (chrome === false) {
      this._modalContainerElement.classList.add('inboxsdk__modal_chromeless');
    } else {
      this._modalContainerElement.classList.remove('inboxsdk__modal_chromeless');
    }
  }

  _setupOverlayElement() {
    this._overlayElement = document.createElement('div');
    this._overlayElement.setAttribute('class', 'Kj-JD-Jh inboxsdk__modal_overlay');
  }

  _setupModalContainerElement() {
    this._modalContainerElement = document.createElement('div');
    this._modalContainerElement.setAttribute('class', 'inboxsdk__modal_fullscreen');

    var htmlString = `
    <div class="Kj-JD inboxsdk__modal_container" tabindex="0" role="alertdialog">
      <div class="Kj-JD-K7 Kj-JD-K7-GIHV4">
        <span class="Kj-JD-K7-K0" role="heading"></span>
        <span class="Kj-JD-K7-Jq inboxsdk__modal_close" role="button"></span>
      </div>
      <div class="Kj-JD-Jz inboxsdk__modal_content">
      </div>
      <div class="Kj-JD-Jl inboxsdk__modal_buttons"></div>
    </div>
    `;

    this._modalContainerElement.innerHTML = htmlString;
  }

  _checkForMoreThanOnePrimaryButton(buttons: Object[]) {
    if(
      _.chain(buttons)
       .pluck('type')
       .filter(function(type){return type === 'PRIMARY_ACTION';})
       .value().length > 1
     ) {
       throw new Error('At most one primary button is allowed');
     }
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
});

export default GmailModalViewDriver;
