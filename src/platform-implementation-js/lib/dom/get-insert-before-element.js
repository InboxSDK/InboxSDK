/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Bacon = require('baconjs');
var isNumber = require('isnumber');

export default function getInsertBeforeElement(checkElement: HTMLElement, childElements: any, dataAttributes: string[]): ?HTMLElement {
	var checkValues = {};
	var insertBeforeElement: ?HTMLElement = null;

	dataAttributes.forEach(function(attribute){
		var value = checkElement.getAttribute(attribute);
		checkValues[attribute] = isNumber(value) ? parseFloat(value) : value;
	});

	for(var ii=0; ii<childElements.length; ii++){
		var child: HTMLElement = (childElements[ii]:any);

		if(_isChildAfter(checkValues, child, dataAttributes)){
			insertBeforeElement = child;
			break;
		}
	}

	return insertBeforeElement;
}

function _isChildAfter(checkValues: Object, child: HTMLElement, dataAttributes: string[]): boolean {
	for(var ii=0; ii<dataAttributes.length; ii++){
		var attribute = dataAttributes[ii];
		var value = child.getAttribute(attribute);

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
