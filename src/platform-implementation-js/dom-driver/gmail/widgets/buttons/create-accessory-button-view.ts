/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import { ButtonViewI } from '../../../../widgets/buttons/basic-button-view-controller';

export default class CreateAccessoryButtonView implements ButtonViewI {
  private _element: HTMLElement = document.createElement('div');
  private _eventStream = kefirBus<any, any>();
  private _stopper = kefirStopper();

  constructor() {
    this._setupElement();
    this._setupEventStream();
  }
  addClass(className: string): void {}
  removeClass(className: string): void {}

  update() {
    // noop
  }

  setEnabled() {
    throw new Error('not implemented');
  }

  destroy() {
    this._eventStream.end();
    this._stopper.destroy();
    this._element.remove();
  }

  getElement(): HTMLElement {
    return this._element;
  }

  getEventStream(): Kefir.Observable<any, any> {
    return this._eventStream;
  }

  activate() {
    const innerButtonElement = this._element.firstElementChild;
    if (innerButtonElement) innerButtonElement.classList.add('aj1');
  }

  deactivate() {
    const innerButtonElement = this._element.firstElementChild;
    if (innerButtonElement) innerButtonElement.classList.remove('aj1');
  }

  private _setupElement() {
    this._element.setAttribute('class', 'nL aig');
    this._element.setAttribute('style', 'left: 7px');

    this._element.innerHTML = [
      '<div class="pM aRw" style="display: inline-flex; margin-left: 16px;" role="button">',
      '<div class="p6">',
      '<div class="p8">▼</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  private _setupEventStream() {
    const clickEventStream = Kefir.fromEvents<any, never>(
      this._element,
      'click'
    );

    clickEventStream.onValue((event) => {
      event.stopPropagation();
      event.preventDefault();
    });

    this._eventStream.plug(
      clickEventStream.map((event) => ({ eventName: 'click', domEvent: event }))
    );
  }
}
