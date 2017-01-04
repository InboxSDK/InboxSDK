/* @flow */

export default class InboxDropdownView {
  _containerEl: HTMLElement;
  _contentEl: HTMLElement;

  constructor() {
    this._containerEl = document.createElement('div');
    this._containerEl.className = 'inboxsdk__dropdown';
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'inboxsdk__dropdown_content';
    this._containerEl.appendChild(this._contentEl);
  }

  getContentElement(): HTMLElement {
    return this._contentEl;
  }

  getContainerElement(): HTMLElement {
    return this._containerEl;
  }

  destroy() {
    (this._containerEl:any).remove();
  }
}
