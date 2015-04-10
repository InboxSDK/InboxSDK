const _ = require('lodash');
const Bacon = require('baconjs');

module.exports = function(element, html, oldRange){
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
				var range;

				if(oldRange){
					range = oldRange;
					range.detach();
				}
				else{
					range = sel.getRangeAt(0);
					range.deleteContents();
				}

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

				// Simulate a mousedown event to kill any existing focus-fixers.
				var event = document.createEvent('MouseEvents');
				event.initMouseEvent('mousedown', false, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
				event.preventDefault();
				element.dispatchEvent(event);

				// Preserve the cursor position
				range.collapse(false);
				sel.removeAllRanges();
				sel.addRange(range);

				var nextUserCursorMove = Bacon.mergeAll(
					Bacon.fromEventTarget(element, 'mousedown'),
					Bacon.fromEventTarget(element, 'keypress')
				);

				// Whenever the body element gets focus, manually make sure the cursor
				// is in the right position, because Chrome likes to put it in the
				// previous location instead because it hates us.
				var focus = Bacon
					.fromEventTarget(element, 'focus')
					.takeUntil(nextUserCursorMove)
					.onValue(function() {
						sel.removeAllRanges();
						sel.addRange(range);
					});

				return firstChild;
			}
		}
	}
};
