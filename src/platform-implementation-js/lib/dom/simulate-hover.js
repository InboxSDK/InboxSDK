function simulateHover(element){
	var event = document.createEvent("MouseEvents");
    event.initMouseEvent("mouseover", true, true, window,
        0, element.offsetLeft, element.offsetTop, 0, 0, false, false, false, false, 0, null);
    element.dispatchEvent(event);
}

module.exports = simulateHover;
