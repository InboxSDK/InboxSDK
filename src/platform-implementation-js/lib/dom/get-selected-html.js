module.exports = function(element){
	element.focus();

	var selection = document.getSelection();
	if(!selection){
		return null;
	}

	if(selection.rangeCount < 1){
		return null;
	}

	var range = selection.getRangeAt(0);
	if(!range){
		return null;
	}

	var rangeContentsClone = range.cloneContents();
	var div = document.createElement('div');
	div.appendChild(rangeContentsClone);

	return div.innerHTML;
};
