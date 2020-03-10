import kefirStopper from 'kefir-stopper';
import GmailDriver from '../gmail-driver';

export interface SupportItemDescriptor {
  element: HTMLElement;
  onClick: () => void;
}

export default class GmailSupportItemView {
  _stopper = kefirStopper();
  _driver: GmailDriver;
  _insertElementContainer: HTMLElement | null = null;

  constructor(
    driver: GmailDriver,
    supportItemDescriptor: SupportItemDescriptor
  ) {
    this._driver = driver;
    this._setup(supportItemDescriptor);
  }

  destroy() {
    this._stopper.destroy();
    if (this._insertElementContainer) {
      this._insertElementContainer.remove();
      this._insertElementContainer = null;
    }
  }

  _setup(supportItemDescriptor: SupportItemDescriptor) {
    const supportMenuNodes = this._driver
      .getTagTree()
      .getAllByTag('supportMenu');

    const subscription = supportMenuNodes.subscribe(changes => {
      changes.forEach(change => {
        if (change.type === 'add') {
          this._addSupportElement(
            change.value.getValue(),
            supportItemDescriptor
          );
        } else if (change.type === 'remove') {
          if (this._insertElementContainer) {
            this._insertElementContainer.remove();
            this._insertElementContainer = null;
          }
        }
      });
    });

    this._stopper.onValue(() => subscription.unsubscribe());
  }

  _addSupportElement(
    supportElement: HTMLElement,
    supportItemDescriptor: SupportItemDescriptor
  ) {
    const insertElementContainer = document.createElement('div');
    const menuItemAttributes = supportElement.children.item(0)!.attributes;

    for (const attribute of menuItemAttributes!) {
      if (attribute.name === 'aria-label') {
        continue;
      }
      if (attribute.name === 'class') {
        const classes = `${attribute.value} inboxsdk__support_menuItem`;
        insertElementContainer.setAttribute(attribute.name, classes);
        continue;
      }
      insertElementContainer.setAttribute(attribute.name, attribute.value);
    }

    // Append to-be-inserted element
    insertElementContainer.append(supportItemDescriptor.element);

    // Adjust insert position to always be the last one before separator
    let lastSeparatorItem = null;
    for (const item of supportElement.children) {
      if (item.getAttribute('role') === 'separator') {
        lastSeparatorItem = item;
      }
    }
    if (lastSeparatorItem) {
      lastSeparatorItem.insertAdjacentElement(
        'beforebegin',
        insertElementContainer
      );
    } else {
      supportElement.append(insertElementContainer);
    }

    insertElementContainer.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      supportItemDescriptor.onClick();
      this._closeSupportMenu(supportElement);
    };

    insertElementContainer.onkeypress = event => {
      if (event.key === 'Enter') {
        supportItemDescriptor.onClick();
        this._closeSupportMenu(supportElement);
      }
    };
  }

  _closeSupportMenu(supportElement: HTMLElement) {
    if (supportElement.getAttribute('aria-hidden') != 'true') {
      const button = supportElement.previousElementSibling;
      button && (button as HTMLElement).click();
    }
  }
}
