var Bacon = require('baconjs');

module.exports = function(checkElement, childElements, dataAttributes){
	var checkValues = {};
	var insertBeforeElement = null;

	dataAttributes.forEach(function(attribute){
		checkValues[attribute] = checkElement.getAttribute(attribute);
	});

	for(var ii=0; ii<childElements.length; ii++){
		var child = childElements[ii];

		if(_isChildAfter(checkValues, child, dataAttributes)){
			insertBeforeElement = child;
			break;
		}
	}


	return insertBeforeElement;
};

function _isChildAfter(checkValues, child, dataAttributes){
	for(var ii=0; ii<dataAttributes.length; ii++){
		var attribute = dataAttributes[ii];

		if(child.getAttribute(attribute) > checkValues[attribute]){
			return true;
		}
	}

	return false;
}
