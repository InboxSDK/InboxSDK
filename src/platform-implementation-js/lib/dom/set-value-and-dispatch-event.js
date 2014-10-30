function setValueAndDispatchInputEvent(element, value, eventName){
	element.value = value;

	var event = document.createEvent('Event');
	event.initEvent(eventName);

	element.dispatchEvent(event);
}

module.exports = setValueAndDispatchInputEvent;
