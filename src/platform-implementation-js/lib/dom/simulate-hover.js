/* @flow */
//jshint ignore:start

export default function simulateHover(element: HTMLElement) {
	var event: Object = document.createEvent("MouseEvents");
	event.initMouseEvent("mouseover", true, true, window,
		0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);
}
