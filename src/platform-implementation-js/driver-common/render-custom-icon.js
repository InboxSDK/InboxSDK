/* @flow */

export default function renderCustomIcon(
  iconSettings: Object,
  containerElement: HTMLElement,
  customIconElement: HTMLElement,
  append: boolean,
  insertBeforeEl: ?HTMLElement
) {
  iconSettings.iconElement = customIconElement;
  iconSettings.iconElement.classList.add('inboxsdk__button_icon');

  if (append) {
    containerElement.appendChild(iconSettings.iconElement);
  } else {
    containerElement.insertBefore(
      iconSettings.iconElement,
      insertBeforeEl || (containerElement: any).firstElementChild
    );
  }
}
