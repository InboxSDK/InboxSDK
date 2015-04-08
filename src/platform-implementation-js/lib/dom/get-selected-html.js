module.exports = function(element, range){
	element.focus();

	if(!range){
		let selection = document.getSelection();
		if(!selection){
			return null;
		}

		if(selection.rangeCount < 1){
			return null;
		}

		range = selection.getRangeAt(0);
		if(!range){
			return null;
		}
	}

	let rangeContentsClone = range.cloneContents();
	let div = document.createElement('div');
	div.appendChild(rangeContentsClone);

	return div.innerHTML;
};
