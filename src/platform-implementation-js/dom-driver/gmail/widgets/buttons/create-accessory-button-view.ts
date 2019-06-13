import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import { ButtonViewI } from '../../../../widgets/buttons/basic-button-view-controller';

export default class CreateAccessoryButtonView implements ButtonViewI {
  private _element: HTMLElement = document.createElement('div');
  private _eventStream = Kefir.pool<any, any>();
  private _stopper = kefirStopper();

  public constructor() {
    this._setupElement();
    this._setupEventStream();
  }

  public update() {}

  public setEnabled() {
    throw new Error('not implemented');
  }

  public destroy() {
    (this._eventStream as any).end();
    this._stopper.destroy();
    this._element.remove();
  }

  public getElement(): HTMLElement {
    return this._element;
  }

  public getEventStream(): Kefir.Observable<any, any> {
    return this._eventStream;
  }

  public activate() {
    const innerButtonElement = this._element.firstElementChild;
    if (innerButtonElement) innerButtonElement.classList.add('aj1');
  }

  public deactivate() {
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
      '</div>'
    ].join('');
  }

  private _setupEventStream() {
    const clickEventStream = Kefir.fromEvents<any, never>(
      this._element,
      'click'
    );

    clickEventStream.onValue(event => {
      event.stopPropagation();
      event.preventDefault();
    });

    this._eventStream.plug(
      clickEventStream.map(event => ({ eventName: 'click', domEvent: event }))
    );
  }
}
