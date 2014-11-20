var _ = require('lodash');

module.exports = function(element, html){
	element.focus();

	if (element.tagName === 'TEXTAREA') {
		var oldStart = element.selectionStart;
		// first delete selected range
		if (element.selectionStart < element.selectionEnd) {
			element.value = element.value.substring(0, element.selectionStart) + element.value.substring(element.selectionEnd);
		}
		// insert into position
		element.value = element.value.substring(0, oldStart) + html + element.value.substring(oldStart);
		// set caret
		element.selectionStart = oldStart + html.length;
		element.selectionEnd = oldStart + html.length;
	} else {
		var editable = null;
		if (element.getSelection) {
			editable = element;
		} else if (element.ownerDocument && element.ownerDocument.getSelection) {
			editable = element.ownerDocument;
		}

		if (editable) {
			var sel = editable.getSelection();
			if (sel.getRangeAt && sel.rangeCount) {
				var range = sel.getRangeAt(0);
				range.deleteContents();

				var frag;
				if (html instanceof DocumentFragment) {
					frag = html;
				} else {
					frag = document.createDocumentFragment();
					if (html instanceof HTMLElement) {
						frag.appendChild(html);
					} else {
						var el = document.createElement('div');
						el.innerHTML = html;
						var node;
						while ((node = el.firstChild)) {
							frag.appendChild(node);
						}
					}
				}

				var firstChild = frag.firstChild, lastChild = frag.lastChild;
				range.insertNode(frag);

				// Preserve the cursor position
				// Doesn't seem to work. TODO
				// if (lastChild) {
				// 	range = range.cloneRange();
				// 	range.setStartAfter(lastChild);
				// 	range.collapse(true);
				// 	sel.removeAllRanges();
				// 	sel.addRange(range);
				// }

				return firstChild;
			}
		}
	}
};
