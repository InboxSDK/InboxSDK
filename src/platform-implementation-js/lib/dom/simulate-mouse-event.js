/* @flow */

export default function simulateMouseEvent(element: HTMLElement, mouseEventName: string) {
	var event: Object = document.createEvent("MouseEvents");
	event.initMouseEvent(mouseEventName, true, true, window,
		0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);
}

export function simulateHover(element: HTMLElement) {
	simulateMouseEvent(element, 'mouseover');
}

export function simulateClick(element: HTMLElement){
	simulateMouseEvent(element, 'mousedown');
	simulateMouseEvent(element, 'mouseup');
	simulateMouseEvent(element, 'click');
	simulateMouseEvent(element, 'mouseleave');
	simulateMouseEvent(element, 'mouseout');
	element.blur();
}
