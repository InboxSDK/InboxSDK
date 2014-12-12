module.exports = function(element, text){
	element.focus();

	if (element.tagName === 'TEXTAREA') {
		var oldStart = element.selectionStart;
		// first delete selected range
		if (element.selectionStart < element.selectionEnd) {
			element.value = element.value.substring(0, element.selectionStart) + element.value.substring(element.selectionEnd);
		}
		// insert into position
		element.value = element.value.substring(0, oldStart) + text + element.value.substring(oldStart);
		// set caret
		element.selectionStart = oldStart + text.length;
		element.selectionEnd = oldStart + text.length;
	} else {
		var sel, range, textNode;
		var editable = null;
		if (element.getSelection) {
			editable = element;
		} else if (element.ownerDocument && element.ownerDocument.getSelection) {
			editable = element.ownerDocument;
		}

		if (editable) {
			sel = editable.getSelection();
			if (sel.getRangeAt && sel.rangeCount) {
				range = sel.getRangeAt(0);
				range.deleteContents();

				var node = document.createTextNode(text);
				range.insertNode(node);
				range = range.cloneRange();
				range.setStartAfter(node);
				range.collapse(true);
				sel.removeAllRanges();
				sel.addRange(range);

				return node;
			}
		}
	}
};
