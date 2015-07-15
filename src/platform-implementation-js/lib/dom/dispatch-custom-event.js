/* @flow */
//jshint ignore:start

export default function dispatchCustomEvent(element: HTMLElement, eventName: string, data: any) {
	document.dispatchEvent(new CustomEvent(eventName, {
		bubbles: true,
		cancelable: false,
		detail: data
	}));
};
