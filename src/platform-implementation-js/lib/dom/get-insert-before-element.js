/* @flow */

import isNumber from 'isnumber';

export default function getInsertBeforeElement(checkElement: HTMLElement, childElements: any, dataAttributes: string[]): ?HTMLElement {
	const checkValues = {};
	let insertBeforeElement: ?HTMLElement = null;

	dataAttributes.forEach(function(attribute){
		const value = checkElement.getAttribute(attribute);
		checkValues[attribute] = isNumber(value) ? parseFloat(value) : value;
	});

	for(let ii=0; ii<childElements.length; ii++){
		const child: HTMLElement = (childElements[ii]:any);

		if(_isChildAfter(checkValues, child, dataAttributes)){
			insertBeforeElement = child;
			break;
		}
	}

	return insertBeforeElement;
}

function _isChildAfter(checkValues: Object, child: HTMLElement, dataAttributes: string[]): boolean {
	for(let ii=0; ii<dataAttributes.length; ii++){
		const attribute = dataAttributes[ii];
		let value = child.getAttribute(attribute);

		value = isNumber(value) ? parseFloat(value) : value;

		if(value > checkValues[attribute]){
			return true;
		}
		else if(value < checkValues[attribute]){
			return false;
		}
	}

	return false;
}
