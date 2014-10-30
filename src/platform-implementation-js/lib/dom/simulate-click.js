function simulateClick(element){
	var event = document.createEvent('MouseEvents');
	event.initMouseEvent('mousedown', true, true, window, 0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);

	event = document.createEvent('MouseEvents');
	event.initMouseEvent('mouseup', true, true, window, 0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);

	event = document.createEvent('MouseEvents');
	event.initMouseEvent('click', true, true, window, 0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
	element.dispatchEvent(event);
}

module.exports = simulateClick;
