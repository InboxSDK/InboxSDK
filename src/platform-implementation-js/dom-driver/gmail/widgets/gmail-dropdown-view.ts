import blockAndReemiteKeyboardEvents from '../../../lib/dom/block-and-reemit-keyboard-events';

export default class GmailDropdownView {
  private _containerElement: HTMLElement;
  private _contentElement: HTMLElement;

  public constructor() {
    this._containerElement = document.createElement('div');
    this._containerElement.setAttribute('class', 'inboxsdk__menu');

    this._contentElement = document.createElement('div');
    this._contentElement.setAttribute('class', 'inboxsdk__menuContent');

    this._containerElement.appendChild(this._contentElement);

    blockAndReemiteKeyboardEvents(this._containerElement);
  }

  public destroy() {
    this._containerElement.remove();
  }

  public getContainerElement() {
    return this._containerElement;
  }

  public getContentElement() {
    return this._contentElement;
  }
}
