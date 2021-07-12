import GenericButtonView from '../../../../lib/dom/generic-button-view';

export default class MoreDropdownButtonView extends GenericButtonView {
  private _isActive = false;

  constructor() {
    super(document.createElement('div'));
    const element = this._element;

    element.setAttribute('class', 'nL aig');

    const child = document.createElement('div');
    child.setAttribute('class', 'pM aj0');

    element.appendChild(child);

    element.addEventListener('click', () => {
      this._isActive = true;
    });

    element.addEventListener('mouseenter', () => {
      child.classList.add('aj1');
    });

    element.addEventListener('mouseleave', () => {
      if (!this._isActive) {
        child.classList.remove('aj1');
      }
    });
  }

  activate() {
    this.getElement().children[0].classList.add('aj1');
  }

  deactivate() {
    this.getElement().children[0].classList.remove('aj1');
    this._isActive = false;
  }
}
