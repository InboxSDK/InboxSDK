export default function renderCustomIcon(
  containerElement: HTMLElement,
  customIconElement: HTMLElement,
  append: boolean,
  insertBeforeEl: HTMLElement | null | undefined
) {
  // Check if icon wrapper exist or not
  // when renderCustomIcon gets called for updating navItemDescriptor
  let iconElementWrapper = containerElement.querySelector(
    '.inboxsdk__button_icon'
  );

  if (!iconElementWrapper) {
    iconElementWrapper = document.createElement('div');
    iconElementWrapper.classList.add('inboxsdk__button_icon');
    iconElementWrapper.appendChild(customIconElement);
  }

  if (append) {
    containerElement.appendChild(iconElementWrapper);
  } else {
    containerElement.insertBefore(
      containerElement,
      insertBeforeEl || containerElement!.firstElementChild
    );
  }
}
