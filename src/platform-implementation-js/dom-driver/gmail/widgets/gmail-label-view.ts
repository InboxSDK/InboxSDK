import isEqual from 'lodash/isEqual';
import updateIcon from '../../../driver-common/update-icon';
import querySelector from '../../../lib/dom/querySelectorOrFail';

class GmailLabelView {
  _element: HTMLElement;
  _labelDescriptor: Record<string, any>;
  _iconSettings: Record<string, any>;

  constructor(
    opts: {
      classes?: string[] | null | undefined;
    } = {}
  ) {
    this._element = document.createElement('div');
    this._element.className =
      'inboxsdk__gmail_label ar as ' + (opts.classes || []).join(' ');
    this._element.innerHTML = `
			<div class="at">
				<div class="au">
					<div class="av"></div>
				</div>
			</div>`;
    this._labelDescriptor = {};
    this._iconSettings = {};
  }

  getElement(): HTMLElement {
    return this._element;
  }

  updateLabelDescriptor(
    labelDescriptor: Record<string, any> | null | undefined
  ) {
    this._handleNewLabelDescriptor(labelDescriptor);
  }

  _handleNewLabelDescriptor(
    labelDescriptor: Record<string, any> | null | undefined
  ) {
    if (!labelDescriptor) {
      this._labelDescriptor = {};
      return;
    }

    labelDescriptor = Object.assign(
      {
        foregroundColor: 'rgb(102, 102, 102)',
        //dark grey
        backgroundColor: 'rgb(221, 221, 221)',
        //light grey
        maxWidth: '90px',
      },
      labelDescriptor
    );

    if (isEqual(this._labelDescriptor, labelDescriptor)) {
      return;
    }

    updateIcon(
      this._iconSettings,
      querySelector(this._element, '.at'),
      false,
      labelDescriptor.iconClass,
      labelDescriptor.iconUrl,
      undefined,
      labelDescriptor.iconHtml
    );

    if (
      labelDescriptor.iconClass ||
      labelDescriptor.iconUrl ||
      labelDescriptor.iconHtml
    ) {
      this._element.classList.add('inboxsdk__label_has_icon');
    } else {
      this._element.classList.remove('inboxsdk__label_has_icon');
    }

    this._updateBackgroundColor(labelDescriptor.backgroundColor);

    this._updateForegroundColor(labelDescriptor.foregroundColor);

    this._updateIconBackgroundColor(labelDescriptor.iconBackgroundColor);

    this._updateTitle(labelDescriptor.title, labelDescriptor.titleHtml);

    this._updateTextMaxWidth(labelDescriptor.maxWidth);

    this._labelDescriptor = labelDescriptor;
  }

  _updateTextMaxWidth(maxWidth: string) {
    if (this._labelDescriptor.maxWidth === maxWidth) {
      return;
    }

    const childEl = this._element.querySelector<HTMLElement>('.av');

    if (childEl) {
      childEl.style.maxWidth = maxWidth;
    }
  }

  _updateBackgroundColor(backgroundColor: string) {
    if (this._labelDescriptor.backgroundColor === backgroundColor) {
      return;
    }

    const elToChange = querySelector(this._element, '.at');
    elToChange.style.backgroundColor = backgroundColor;
    elToChange.style.borderColor = backgroundColor;
    querySelector(this._element, '.au').style.borderColor = backgroundColor;
  }

  _updateForegroundColor(foregroundColor: string) {
    if (this._labelDescriptor.foregroundColor === foregroundColor) {
      return;
    }

    querySelector(this._element, '.at').style.color = foregroundColor;
  }

  _updateIconBackgroundColor(iconBackgroundColor: string | null | undefined) {
    const icon = this.getElement().querySelector<HTMLElement>(
      '.inboxsdk__button_icon'
    );

    if (icon) {
      icon.style.backgroundColor = iconBackgroundColor || '';
    }
  }

  _updateTitle(title: string, titleHtml?: string) {
    if (
      this._labelDescriptor.title === title &&
      this._labelDescriptor.titleHtml === titleHtml
    ) {
      return;
    }

    if (titleHtml) {
      querySelector(this._element, '.au').innerHTML = titleHtml || '';
      return;
    }

    let contentEl;

    try {
      contentEl = querySelector(this._element, '.av');
    } catch (e) {
      const outerEl = querySelector(this._element, '.au');
      outerEl.innerHTML = '';
      contentEl = document.createElement('div');
      contentEl.setAttribute('class', 'av');
      outerEl.appendChild(contentEl);
    }

    contentEl.textContent = title;

    this._element.children[0].setAttribute('data-tooltip', title);
  }
}

export default GmailLabelView;
