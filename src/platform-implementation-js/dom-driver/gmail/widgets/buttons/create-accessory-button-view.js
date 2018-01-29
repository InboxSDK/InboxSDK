/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

export default class CreateAccessoryButtonView {
	_element: HTMLElement;
	_eventStream: Kefir.Observable<Object>;
	_stopper = kefirStopper();

	constructor(options?: Object){
		this._setupElement();
		this._setupEventStream();
	}

	destroy(){
		this._stopper.destroy();
		this._element.remove();
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

	activate(){
		const innerButtonElement = this._element.firstElementChild;
		if (innerButtonElement) innerButtonElement.classList.add('aj1');
	}

	deactivate(){
		const innerButtonElement = this._element.firstElementChild;
		if (innerButtonElement) innerButtonElement.classList.remove('aj1');
	}

	_setupElement(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'nL aig');
		this._element.setAttribute('style', 'left: 7px');

		this._element.innerHTML = [
			'<div class="pM aRw" style="display: inline-flex; margin-left: 16px;" role="button">',
				'<div class="p6">',
					'<div class="p8">▼</div>',
				'</div>',
			'</div>'
		].join('');
	}

	_setupEventStream(){
		const clickEventStream = Kefir.fromEvents(this._element, 'click');

		clickEventStream.onValue((event) => {
			event.stopPropagation();
			event.preventDefault();
		});

		this._eventStream =
			clickEventStream
				.map((event) => ({eventName: 'click', domEvent: event}))
				.takeUntilBy(this._stopper);
	}
}
