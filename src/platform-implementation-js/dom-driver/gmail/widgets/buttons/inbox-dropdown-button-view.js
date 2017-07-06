/* @flow */

import GenericButtonView from '../../../../lib/dom/generic-button-view';

export default function makeInboxDropdownButtonView() {
	return new GenericButtonView(_getInboxDropdownButtonElement());
}

function _getInboxDropdownButtonElement(){
	const element = document.createElement('div');
	element.setAttribute('class', 'aAE J-J5-Ji J-JN-M-I');

	element.innerHTML = '<div class="J-J5-Ji J-JN-M-I-JG">&nbsp;</div>';

	element.addEventListener('mouseenter', function() {
		element.classList.add('J-JN-M-I-JW');
	});

	element.addEventListener('mouseleave', function() {
		element.classList.remove('J-JN-M-I-JW');
	});

	return element;
}
