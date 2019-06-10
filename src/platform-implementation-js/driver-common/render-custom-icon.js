/* @flow */

export default function renderCustomIcon(
  containerElement: HTMLElement,
  customIconElement: HTMLElement,
  append: boolean,
  insertBeforeEl: ?HTMLElement
) {
  const iconElementWrapper = document.createElement('div');
  iconElementWrapper.classList.add('inboxsdk__button_icon');
  iconElementWrapper.appendChild(customIconElement);

  if (append) {
    containerElement.appendChild(iconElementWrapper);
  } else {
    containerElement.insertBefore(
      containerElement,
      insertBeforeEl || (containerElement: any).firstElementChild
    );
  }
}
