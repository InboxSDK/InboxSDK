/* @flow */

export default function setValueAndDispatchInputEvent(element: HTMLElement, value: string, eventName: string) {
	(element:any).value = value;

	const event = document.createEvent('Event');
	(event:any).initEvent(eventName);

	element.dispatchEvent(event);
}
