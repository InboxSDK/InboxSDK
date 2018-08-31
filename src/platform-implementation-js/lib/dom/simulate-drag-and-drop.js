/* @flow */

import triggerRelayEvent from './trigger-relay-event';

function makeDataTransferObj(files: Array<Blob|File>) {
	const fileNames: Array<?string> = Array.from(files).map(file => typeof file.name === 'string' ? file.name : undefined);
	return {files, fileNames};
}

export function simulateDragOver(element: HTMLElement, files: Blob[]) {
	const dataTransfer = makeDataTransferObj(files);
	const props = {
		screenX: 0, screenY: 0, clientX: 0, clientY: 0, buttons: 1,
		ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
		detail: 0
	};

	triggerRelayEvent(element, {
		type: 'dragenter', bubbles: true, cancelable: false,
		props,
		dataTransfer
	});

	triggerRelayEvent(element, {
		type: 'dragover', bubbles: true, cancelable: false,
		props,
		dataTransfer
	});
}

export function simulateDrop(element: HTMLElement, files: Blob[]) {
	const dataTransfer = makeDataTransferObj(files);
	const props = {
		screenX: 0, screenY: 0, clientX: 0, clientY: 0, buttons: 1,
		ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
		detail: 0
	};

	triggerRelayEvent(element, {
		type: 'drop', bubbles: true, cancelable: false,
		props,
		dataTransfer
	});
}

export function simulateDragEnd(element: HTMLElement, files: Blob[]) {
	const dataTransfer = makeDataTransferObj(files);
	const props = {
		screenX: 0, screenY: 0, clientX: 0, clientY: 0, buttons: 1,
		ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
		detail: 0
	};

	triggerRelayEvent(element, {
		type: 'dragleave', bubbles: true, cancelable: false,
		props,
		dataTransfer
	});

	triggerRelayEvent(element, {
		type: 'dragend', bubbles: true, cancelable: false,
		props,
		dataTransfer
	});
}
