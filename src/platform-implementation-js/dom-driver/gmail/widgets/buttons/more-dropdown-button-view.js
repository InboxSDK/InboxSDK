/* @flow */

import GenericButtonView from '../../../../lib/dom/generic-button-view';

export default class MoreDropdownButtonView extends GenericButtonView {
  _isActive = false;

  constructor(buttonOptions: Object) {
    const element = document.createElement('div');
    element.setAttribute('class', 'nL aig');

    const child = document.createElement('div');
    child.setAttribute('class', 'pM aj0');

    element.appendChild(child);

    element.addEventListener('click', function() {
      this._isActive = true;
    });

    element.addEventListener('mouseenter', function() {
      child.classList.add('aj1');
    });

    element.addEventListener('mouseleave', function() {
      if (!this._isActive) {
        child.classList.remove('aj1');
      }
    });

    super(element);
  }

  activate() {
    this.getElement().children[0].classList.add('aj1');
  }

  deactivate() {
    this.getElement().children[0].classList.remove('aj1');
    this._isActive = false;
  }
}
