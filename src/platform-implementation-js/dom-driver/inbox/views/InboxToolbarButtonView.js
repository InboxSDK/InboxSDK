/* @flow */

import {defn} from 'ud';
import includes from 'lodash/includes';
import Kefir from 'kefir';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import InboxDropdownView from './inbox-dropdown-view';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';

let insertionOrderHint: number = 0;

class InboxToolbarButtonView {
  _buttonEl: HTMLElement;

  constructor(buttonDescriptor: Object, groupOrderHint: string, stopper: Kefir.Observable<null>, container: HTMLElement) {
    const div = this._buttonEl = document.createElement('li');
    div.setAttribute('role', 'button');
    div.setAttribute('data-insertion-order-hint', String(insertionOrderHint++));
    div.tabIndex = 0;
    div.className = 'inboxsdk__button_icon';
    const img = document.createElement('img');
    img.className = 'inboxsdk__button_iconImg';
    let onClick = () => {};
    let hasDropdown = false;
    let dropdown = null;
    Kefir.merge([
      Kefir.fromEvents(div, 'click'),
      fromEventTargetCapture(div, 'keyup').filter(e => includes([32/*space*/, 13/*enter*/], e.which))
    ]).onValue(event => {
      event.preventDefault();
      event.stopPropagation();
      if (hasDropdown) {
        if (dropdown) {
          dropdown.close();
          return;
        } else {
          this._buttonEl.classList.add('inboxsdk__active');
          dropdown = new DropdownView(new InboxDropdownView(), div);
          dropdown.setPlacementOptions({
            hAlign: 'right',
            vAlign: 'bottom', forceVAlign: true
          });
          dropdown.on('destroy', () => {
            this._buttonEl.classList.remove('inboxsdk__active');
            dropdown = null;
          });
        }
      }
      onClick({dropdown});
    });
    let lastOrderHint = null;

    {
      hasDropdown = buttonDescriptor.hasDropdown;
      div.title = buttonDescriptor.title;
      div.className = 'inboxsdk__button_icon '+(buttonDescriptor.iconClass||'');
      onClick = buttonDescriptor.onClick;
      if (buttonDescriptor.iconUrl) {
        img.src = buttonDescriptor.iconUrl;
        div.appendChild(img);
      } else {
        img.remove();
      }
      const orderHint = buttonDescriptor.orderHint||0;
      if (lastOrderHint !== orderHint) {
        lastOrderHint = orderHint;
        div.setAttribute('data-order-hint', String(orderHint));
        insertElementInOrder(container, div);
      }
    }

    stopper.onValue(() => {
      div.remove();
      if (dropdown) {
        dropdown.close();
      }
    });
  }
}

export default defn(module, InboxToolbarButtonView);
