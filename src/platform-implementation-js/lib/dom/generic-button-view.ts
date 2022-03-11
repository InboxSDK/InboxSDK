import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';

export default class GenericButtonView {
  private readonly _eventStream = kefirBus<any, any>();
  protected readonly _element: HTMLElement;

  constructor(element: HTMLElement) {
    this._element = element;

    this._setupEventStream();
  }

  destroy() {
    this._element.remove();
    this._eventStream.end();
  }

  getElement(): HTMLElement {
    return this._element;
  }

  getEventStream(): Kefir.Observable<any, any> {
    return this._eventStream;
  }

  activate() {
    /* do nothing */
  }

  deactivate() {
    /* do nothing */
  }

  private _setupEventStream() {
    const clickEventStream = Kefir.fromEvents<MouseEvent, never>(
      this._element,
      'click'
    );

    clickEventStream.onValue((event) => {
      event.stopPropagation();
      event.preventDefault();
    });

    this._eventStream.plug(
      clickEventStream.map((event) => {
        return {
          eventName: 'click',
          domEvent: event,
        };
      })
    );
  }
}
