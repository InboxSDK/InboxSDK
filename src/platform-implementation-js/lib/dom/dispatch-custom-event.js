module.exports = function(element, eventName, data){
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent(eventName, true, false, data);
	element.dispatchEvent(event);
};
