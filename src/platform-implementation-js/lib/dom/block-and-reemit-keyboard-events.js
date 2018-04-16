/* @flow */

import Kefir from 'kefir';

export default function blockAndReemiteKeyboardEvents(element: HTMLElement) {
  // Gmail stops propagation of keyboard events from escaping
	// a specific compose window, which prevents any React components rendered
	// in the compose window's subtree from getting them (since React adds
	// a single event listener on the document). By stopping propagation of
	// the original event and reemiting it on the document, we preserve
	// exisitng behavior while giving React a chance to hear it.
	Kefir.merge([
		Kefir.fromEvents(element, 'keypress'),
		Kefir.fromEvents(element, 'keydown'),
		Kefir.fromEvents(element, 'keyup')
	]).onValue((event: KeyboardEvent) => {
		event.stopPropagation();

		const fakeEvent = new KeyboardEvent(event.type, {bubbles: true});
		Object.defineProperties(fakeEvent, {
			cancelable: {value: event.cancelable},
			bubbles: {value: event.bubbles},
			target: {value: event.target},
			detail: {value: event.detail},
			key: {value: event.key},
			code: {value: event.code},
			location: {value: event.location},
			ctrlKey: {value: event.ctrlKey},
			shiftKey: {value: event.shiftKey},
			altKey: {value: event.altKey},
			metaKey: {value: event.metaKey},
			repeat: {value: event.repeat},
			isComposing: {value: event.isComposing},
			charCode: {value: event.charCode},
			keyCode: {value: event.keyCode},
			which: {value: event.which}
		});
		document.dispatchEvent(fakeEvent);
	});
}
