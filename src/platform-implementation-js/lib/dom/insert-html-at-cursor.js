/* @flow */

import * as ud from 'ud';
import Kefir from 'kefir';

var insertHTMLatCursor = ud.defn(module, function insertHTMLatCursor(element: HTMLElement, html: string, oldRange: ?Object): ?HTMLElement {
	element.focus();

	if (element instanceof HTMLTextAreaElement) {
		var oldStart = (element:any).selectionStart;
		// first delete selected range
		if ((element:any).selectionStart < (element:any).selectionEnd) {
			element.value = element.value.substring(0, (element:any).selectionStart) + element.value.substring((element:any).selectionEnd);
		}
		// insert into position
		element.value = element.value.substring(0, oldStart) + html + element.value.substring(oldStart);
		// set caret
		(element:any).selectionStart = oldStart + html.length;
		(element:any).selectionEnd = oldStart + html.length;
	} else {
		var editable = null;
		if ((element: any).getSelection) {
			editable = element;
		} else if (element.ownerDocument && element.ownerDocument.getSelection) {
			editable = element.ownerDocument;
		}

		if (editable) {
			var sel = (editable:any).getSelection();
			if (sel.getRangeAt && sel.rangeCount) {
				var range = oldRange || sel.getRangeAt(0);
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

				var firstChild: HTMLElement = (frag:any).firstElementChild;
				range.insertNode(frag);

				// Simulate a mousedown event to kill any existing focus-fixers.
				var event = document.createEvent('MouseEvents');
				(event:any).initMouseEvent('mousedown', false, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
				event.preventDefault();
				element.dispatchEvent(event);

				// Preserve the cursor position
				range.collapse(false);
				sel.removeAllRanges();
				sel.addRange(range);

				var nextUserCursorMove = Kefir.merge([
					Kefir.fromEvents(element, 'mousedown'),
					Kefir.fromEvents(element, 'keypress')
				]);

				// Whenever the body element gets focus, manually make sure the cursor
				// is in the right position, because Chrome likes to put it in the
				// previous location instead because it hates us.
				var focus = Kefir
					.fromEvents(element, 'focus')
					.takeUntilBy(nextUserCursorMove)
					.onValue(function() {
						sel.removeAllRanges();
						sel.addRange(range);
					});

				return firstChild;
			}
		}
	}
});
export default insertHTMLatCursor;
