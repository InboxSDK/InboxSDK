/* @flow */
//jshint ignore:start

import {defn} from 'ud';

const simulateClick = defn(module, function simulateClick(element: HTMLElement) {
	var event = document.createEvent('MouseEvents');
	(event:any).initMouseEvent('mousedown', true, true, window, 0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);

	event = document.createEvent('MouseEvents');
	(event:any).initMouseEvent('mouseup', true, true, window, 0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);

	event = document.createEvent('MouseEvents');
	(event:any).initMouseEvent('click', true, true, window, 0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);
});
export default simulateClick;
